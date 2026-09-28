import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/staff";
import { attachmentBody, canViewAttachment } from "@/lib/attachments";

/**
 * Serves a stored document only after a permission check (master brief §7, §17).
 * Staff: any file (views of CNIC / ID documents are written to the audit log).
 * Customers: only files in their own chat conversation (?c=<conversation id>).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const a = await db.attachment.findUnique({ where: { id }, include: { chatMessage: { select: { conversationId: true } } } });
  const staff = await getStaff();
  const conversationId = req.nextUrl.searchParams.get("c");
  // Same response for "missing" and "not allowed", so file ids can't be probed.
  if (!a || !canViewAttachment(a, { staff: !!staff, conversationId })) return new Response("Not found", { status: 404 });

  const body = await attachmentBody(a);
  if (!body) return new Response("File unavailable", { status: 410 });

  if (a.sensitive && staff) {
    await audit({ staffId: staff.id, action: "SENSITIVE_DOCUMENT_VIEWED", entityType: "ATTACHMENT", entityId: a.id, recordLabel: `${a.kind} · ${a.fileName}` });
  }

  const inline = /^(image\/(jpeg|png|webp|gif)|audio\/|application\/pdf)/.test(a.mimeType) && req.nextUrl.searchParams.get("download") !== "1";
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(body.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${a.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // A file can never run scripts, even if someone managed to upload one.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Accept-Ranges": "none",
    },
  });
}
