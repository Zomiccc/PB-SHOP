"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { saveUpload } from "@/lib/storage";
import { VIEWS, aiProvider, storeGlb, type View } from "@/lib/model3d";
import type { FormState } from "./auth";
import { run, str } from "./util";

type Photos = Record<View, string>;

async function launch(productId: string, photos: Photos, pipeline: "TEXTURED" | "AI", staffId: string) {
  const base = {
    productId,
    pipeline,
    createdById: staffId,
    photoFront: photos.front,
    photoBack: photos.back,
    photoLeft: photos.left,
    photoRight: photos.right,
    photoTop: photos.top,
    photoBottom: photos.bottom,
  };
  if (pipeline === "TEXTURED") {
    // Parametric model is assembled in the viewer from the photos, so it's ready immediately — pending approval.
    return db.model3DJob.create({ data: { ...base, provider: "TEXTURED", status: "READY" } });
  }
  const provider = aiProvider();
  try {
    const { providerJobId } = await provider.start(photos);
    return db.model3DJob.create({ data: { ...base, provider: provider.name, providerJobId, status: "PROCESSING" } });
  } catch (e) {
    return db.model3DJob.create({ data: { ...base, provider: provider.name, status: "FAILED", error: e instanceof Error ? e.message : "Failed to start" } });
  }
}

/** Upload the six required views and start generation (§14). All six must be present. */
export async function createModelJobAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const productId = str(f, "productId");
    const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
    const missing = VIEWS.filter((v) => !(f.get(v) instanceof File) || !(f.get(v) as File).size);
    if (missing.length) throw new Error(`Missing photo(s): ${missing.join(", ")}. All six views are required.`);
    const stamp = Date.now().toString(36);
    const photos = {} as Photos;
    for (const v of VIEWS) photos[v] = await saveUpload(f.get(v) as File, `model-sources/${productId}/${stamp}`);
    const pipeline = str(f, "pipeline") === "AI" ? "AI" : "TEXTURED";
    const job = await launch(productId, photos, pipeline, staff.id);
    await audit({ staffId: staff.id, action: "MODEL_3D_JOB_CREATED", entityType: "PRODUCT", entityId: productId, recordLabel: product.name, after: { jobId: job.id, pipeline, status: job.status } });
    revalidatePath(`/admin/products/${productId}`);
    return job.status === "FAILED" ? `Job failed to start: ${job.error}` : job.status === "READY" ? "Model ready — preview it and approve to publish" : "Generation started — check back in a few minutes";
  });
}

/** Poll an AI job; completed models are copied into our storage and marked NEEDS_REVIEW. */
export async function refreshModelJobAction(_: FormState, f: FormData): Promise<FormState> {
  await requireStaff();
  return run(async () => {
    const job = await db.model3DJob.findUniqueOrThrow({ where: { id: str(f, "jobId") } });
    if (job.status !== "PROCESSING" || !job.providerJobId) return `Status: ${job.status}`;
    const r = await aiProvider().poll(job.providerJobId);
    if (r.status === "READY" && r.glbUrl) {
      const url = await storeGlb(r.glbUrl, job.productId);
      await db.model3DJob.update({ where: { id: job.id }, data: { status: "NEEDS_REVIEW", resultUrl: url } });
    } else if (r.status === "FAILED") {
      await db.model3DJob.update({ where: { id: job.id }, data: { status: "FAILED", error: r.error } });
    }
    revalidatePath(`/admin/products/${job.productId}`);
    return r.status === "READY" ? "Model generated — review it before publishing" : r.status === "FAILED" ? `Failed: ${r.error}` : "Still processing";
  });
}

/** Approved model is attached to the product and shown in the customer viewer. */
export async function approveModelJobAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const job = await db.model3DJob.findUniqueOrThrow({ where: { id: str(f, "jobId") }, include: { product: true } });
    if (!["READY", "NEEDS_REVIEW"].includes(job.status)) throw new Error("Only ready models can be approved");
    const data =
      job.pipeline === "AI"
        ? { model3dKind: "GLB", model3dUrl: job.resultUrl, model3dTextures: null }
        : {
            model3dKind: "TEXTURED",
            model3dUrl: null,
            model3dTextures: JSON.stringify({ front: job.photoFront, back: job.photoBack, left: job.photoLeft, right: job.photoRight, top: job.photoTop, bottom: job.photoBottom }),
          };
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id: job.productId }, data });
      await tx.model3DJob.update({ where: { id: job.id }, data: { status: "APPROVED", approvedAt: new Date() } });
      await audit({ staffId: staff.id, action: "MODEL_3D_APPROVED", entityType: "PRODUCT", entityId: job.productId, recordLabel: job.product.name, before: { model3dKind: job.product.model3dKind }, after: { model3dKind: data.model3dKind, jobId: job.id } }, tx);
    });
    revalidatePath(`/admin/products/${job.productId}`);
    return "Published — customers now see this model";
  });
}

/** Regenerate from the stored original photos (optionally with the other pipeline). */
export async function regenerateModelJobAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const old = await db.model3DJob.findUniqueOrThrow({ where: { id: str(f, "jobId") } });
    const photos: Photos = { front: old.photoFront, back: old.photoBack, left: old.photoLeft, right: old.photoRight, top: old.photoTop, bottom: old.photoBottom };
    const job = await launch(old.productId, photos, str(f, "pipeline") === "AI" ? "AI" : "TEXTURED", staff.id);
    await audit({ staffId: staff.id, action: "MODEL_3D_REGENERATED", entityType: "PRODUCT", entityId: old.productId, after: { fromJob: old.id, jobId: job.id, pipeline: job.pipeline } });
    revalidatePath(`/admin/products/${old.productId}`);
    return job.status === "FAILED" ? `Failed: ${job.error}` : "New job created";
  });
}
