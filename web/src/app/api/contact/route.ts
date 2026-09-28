import { NextResponse } from "next/server";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { db } from "@/lib/db";
import { AttachmentError, filesFrom, inspectUpload, saveAttachment } from "@/lib/attachments";

const Contact = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    phone: z.string().trim().max(20).optional(),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
    subject: z.string().trim().max(120).optional(),
    message: z.string().trim().min(5, "Write a short message").max(3000),
    website: z.string().max(0).optional(), // honeypot
  })
  .refine((d) => (d.phone && d.phone.length >= 7) || d.email, { path: ["phone"], message: "Give us a phone number or email so we can reply" });

export async function POST(req: Request) {
  if (!rateLimit(`contact:${ipFrom(req)}`, 5, 600000).ok) return NextResponse.json({ error: "Too many requests — please try again in a few minutes." }, { status: 429 });
  // Multipart (with optional attachments) from the site form; JSON still accepted for simple clients.
  const form = (req.headers.get("content-type") ?? "").includes("multipart/form-data") ? await req.formData().catch(() => null) : null;
  const body = form ? Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")) : await req.json().catch(() => null);
  const parsed = Contact.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  const d = parsed.data;
  const files = form ? filesFrom(form, "attachments").slice(0, 3) : [];
  try {
    for (const f of files) await inspectUpload(f, "OTHER");
  } catch (e) {
    if (e instanceof AttachmentError) return NextResponse.json({ error: e.message, fields: { attachments: [e.message] } }, { status: 422 });
    throw e;
  }
  await db.$transaction(async (tx) => {
    const m = await tx.contactMessage.create({ data: { name: d.name, phone: d.phone || null, email: d.email || null, subject: d.subject || null, message: d.message } });
    for (const f of files) await saveAttachment(f, { kind: "OTHER", contactMessageId: m.id }, tx);
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
