import { NextResponse } from "next/server";
import { AuthError, requireStaff } from "@/lib/staff";
import { CHUNK_SIZE, MediaUploadError, finishUpload, putChunk } from "@/lib/media-upload";

async function guard(fn: () => Promise<Response>) {
  try {
    await requireStaff();
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof MediaUploadError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}

/** One ~3 MB piece of a chunked upload: PUT /api/admin/uploads/{id}?i={index}, raw bytes as the body. */
export async function PUT(req: Request, ctx: RouteContext<"/api/admin/uploads/[id]">) {
  return guard(async () => {
    const { id } = await ctx.params;
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > CHUNK_SIZE) return NextResponse.json({ error: "Piece too large" }, { status: 413 });
    const bytes = Buffer.from(await req.arrayBuffer());
    await putChunk(id, Number(new URL(req.url).searchParams.get("i")), bytes);
    return NextResponse.json({ ok: true });
  });
}

/** Finishes the upload: checks every piece and the file type, then returns the public URL. */
export async function POST(_req: Request, ctx: RouteContext<"/api/admin/uploads/[id]">) {
  return guard(async () => {
    const { id } = await ctx.params;
    return NextResponse.json(await finishUpload(id));
  });
}
