import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireStaff } from "@/lib/staff";
import { MediaUploadError, startUpload } from "@/lib/media-upload";

const Start = z.object({ fileName: z.string().max(200), mimeType: z.string().max(100), size: z.number().int(), folder: z.enum(["broadcasts", "site"]) });

/** Staff only: starts a chunked media upload (v6 §2 broadcast pictures / videos). */
export async function POST(req: Request) {
  try {
    await requireStaff();
    const parsed = Start.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
    return NextResponse.json(await startUpload(parsed.data));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof MediaUploadError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
