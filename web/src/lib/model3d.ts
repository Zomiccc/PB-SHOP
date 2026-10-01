import { readFile } from "node:fs/promises";
import path from "node:path";
import { saveUpload } from "./storage";
import { db } from "./db";

/**
 * 6-photo → 3D pipelines (§14).
 *
 * TEXTURED (default): the six views are mapped onto a parametric phone body in the browser.
 *   Instant, free and always clean — ideal for glossy, near-featureless phones.
 * AI: an image-to-3D provider reconstructs a GLB mesh. The adapter below targets Meshy's
 *   multi-image-to-3D API (MESHY_API_KEY). Verify endpoint, pricing and commercial-use terms
 *   before production; other providers (Tripo, self-hosted) implement the same two methods.
 */

export const VIEWS = ["front", "back", "left", "right", "top", "bottom"] as const;
export type View = (typeof VIEWS)[number];

/** Generation states shown to staff (master brief §11). APPROVED = published to the customer viewer. */
export const MODEL_JOB_STATES = ["PROCESSING", "READY", "FAILED", "NEEDS_REVIEW", "APPROVED"] as const;

/** The views missing from an upload — conversion only starts when all six are present. */
export function missingViews(f: FormData) {
  return VIEWS.filter((v) => {
    const x = f.get(v);
    return !(typeof x === "object" && x !== null && "size" in x && (x as File).size > 0);
  });
}

interface AiProvider {
  name: string;
  start(photoUrls: Record<View, string>): Promise<{ providerJobId: string }>;
  poll(providerJobId: string): Promise<{ status: "PROCESSING" | "READY" | "FAILED"; glbUrl?: string; error?: string }>;
}

async function asDataUri(url: string) {
  if (/^https?:\/\//.test(url)) return url; // already public (object storage)
  const media = url.match(/^\/api\/media\/([\w-]+)$/);
  if (media) {
    // Photo kept in the database fallback (no object storage configured).
    const m = await db.mediaFile.findUniqueOrThrow({ where: { id: media[1] } });
    if (!m.data) throw new Error("Photo not found");
    return `data:${m.mimeType};base64,${Buffer.from(m.data).toString("base64")}`;
  }
  const file = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  const buf = await readFile(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`;
}

const meshy: AiProvider = {
  name: "MESHY",
  async start(photos) {
    const key = process.env.MESHY_API_KEY;
    if (!key) throw new Error("AI provider not configured — set MESHY_API_KEY (or use the Textured pipeline)");
    // Multi-image endpoints accept up to 4 views; front/back/left/right carry the most shape information.
    const image_urls = await Promise.all([photos.front, photos.back, photos.left, photos.right].map(asDataUri));
    const res = await fetch("https://api.meshy.ai/openapi/v1/multi-image-to-3d", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_urls, should_texture: true, enable_pbr: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.result) throw new Error(`Provider rejected the job: ${data.message ?? res.status}`);
    return { providerJobId: String(data.result) };
  },
  async poll(id) {
    const key = process.env.MESHY_API_KEY;
    if (!key) return { status: "FAILED", error: "MESHY_API_KEY missing" };
    const res = await fetch(`https://api.meshy.ai/openapi/v1/multi-image-to-3d/${id}`, { headers: { Authorization: `Bearer ${key}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "FAILED", error: `Provider error ${res.status}` };
    if (data.status === "SUCCEEDED" && data.model_urls?.glb) return { status: "READY", glbUrl: data.model_urls.glb };
    if (data.status === "FAILED" || data.status === "CANCELED") return { status: "FAILED", error: data.task_error?.message ?? "Generation failed" };
    return { status: "PROCESSING" };
  },
};

export function aiProvider(): AiProvider {
  return meshy;
}

/** Copies the provider's temporary GLB into our own storage so it never expires. */
export async function storeGlb(remoteUrl: string, productId: string) {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error("Could not download the generated model");
  const blob = await res.blob();
  return saveUpload(new File([blob], "model.glb", { type: "model/gltf-binary" }), `models/${productId}`, { types: ["model/gltf-binary"], maxBytes: 50 * 1024 * 1024 });
}
