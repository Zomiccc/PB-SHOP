import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

/** Public product media stored in the database fallback (photos, 3D source views, GLB models). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const m = await db.mediaFile.findUnique({ where: { id } });
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.data), {
    headers: {
      "Content-Type": m.mimeType || "application/octet-stream",
      "Content-Length": String(m.size),
      // Each upload gets a new id, so the file never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
