import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { CHUNK_SIZE } from "@/lib/media-upload";

const HEADERS = {
  // Each upload gets a new id, so the file never changes.
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
};

/**
 * Public media stored in the database fallback: product photos, 3D source views, GLB models, and broadcast
 * pictures / videos. Large files are stored in pieces and support Range requests, which browsers (Safari
 * especially) need to play video.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const m = await db.mediaFile.findUnique({ where: { id }, select: { mimeType: true, size: true, data: true, chunked: true, complete: true } });
  if (!m || !m.complete) return new Response("Not found", { status: 404 });
  const type = m.mimeType || "application/octet-stream";

  if (!m.chunked) {
    if (!m.data) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(m.data), { headers: { ...HEADERS, "Content-Type": type, "Content-Length": String(m.size) } });
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let start = 0;
  let end = m.size - 1;
  if (range) {
    if (range[1] === "" && range[2] !== "") start = Math.max(0, m.size - Number(range[2]));
    else {
      start = Number(range[1] || 0);
      if (range[2] !== "") end = Math.min(m.size - 1, Number(range[2]));
    }
    if (start > end || start >= m.size) return new Response(null, { status: 416, headers: { ...HEADERS, "Content-Range": `bytes */${m.size}` } });
  }

  // Stream only the pieces that cover the requested bytes, one at a time.
  const first = Math.floor(start / CHUNK_SIZE);
  const last = Math.floor(end / CHUNK_SIZE);
  let idx = first;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (idx > last) return controller.close();
      const piece = await db.mediaChunk.findUnique({ where: { mediaId_idx: { mediaId: id, idx } }, select: { data: true } });
      if (!piece) return controller.error(new Error("Missing piece"));
      const from = idx === first ? start - idx * CHUNK_SIZE : 0;
      const to = idx === last ? end - idx * CHUNK_SIZE + 1 : piece.data.length;
      controller.enqueue(new Uint8Array(piece.data).subarray(from, to));
      idx++;
    },
  });
  return new Response(body, {
    status: range ? 206 : 200,
    headers: { ...HEADERS, "Content-Type": type, "Content-Length": String(end - start + 1), ...(range ? { "Content-Range": `bytes ${start}-${end}/${m.size}` } : {}) },
  });
}
