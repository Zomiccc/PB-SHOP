import { NextResponse } from "next/server";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { db } from "@/lib/db";
import { nextRepairRef } from "@/lib/orders";
import { saveUpload, StorageUnavailableError, UploadError } from "@/lib/storage";
import { REPAIR_CATEGORIES, DROP_OFF } from "@/lib/constants";
import { getCurrentCustomer } from "@/lib/auth";
import { notify, notifyStaff } from "@/lib/notify";

const phoneRx = /^(\+92|0)?3\d{2}[\s-]?\d{7}$/;

const Repair = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().regex(phoneRx, "Enter a valid Pakistani mobile number, e.g. 0300 1234567"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  brand: z.string().trim().min(1, "Choose the phone brand").max(40),
  model: z.string().trim().min(1, "Enter the model").max(80),
  category: z.enum(Object.keys(REPAIR_CATEGORIES) as [string, ...string[]], { message: "Choose the repair type" }),
  description: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(2000),
  dropOff: z.enum(Object.keys(DROP_OFF) as [string, ...string[]]),
  preferredAt: z.string().optional(),
  agree: z.literal("on", { message: "Please accept the repair terms" }),
});

/** Customer repair request (§8). Creates a PBR-xxxx reference and an initial NEW status entry. */
export async function POST(req: Request) {
  if (!rateLimit(`repairs:${ipFrom(req)}`, 6, 600000).ok) return NextResponse.json({ error: "Too many requests — please try again in a few minutes." }, { status: 429 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form" }, { status: 400 });

  const parsed = Repair.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  }
  const data = parsed.data;

  let preferredAt: Date | null = null;
  if (data.preferredAt) {
    preferredAt = new Date(data.preferredAt);
    if (isNaN(preferredAt.getTime()) || preferredAt.getTime() < Date.now() - 3600_000) {
      return NextResponse.json({ error: "Choose a future date and time", fields: { preferredAt: ["Choose a future date and time"] } }, { status: 422 });
    }
  }

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  const photos: string[] = [];
  try {
    for (const f of files) photos.push(await saveUpload(f, "repairs"));
  } catch (e) {
    // Demo servers without storage still accept the repair — just without photos.
    if (e instanceof StorageUnavailableError) photos.length = 0;
    else if (e instanceof UploadError) return NextResponse.json({ error: e.message, fields: { photos: [e.message] } }, { status: 422 });
    else throw e;
  }

  const customer = await getCurrentCustomer();
  const phone = data.phone.replace(/[\s-]/g, "");

  const repair = await db.$transaction(async (tx) => {
    const ref = await nextRepairRef(tx);
    const linked = customer ?? (await tx.customer.findUnique({ where: { phone } }));
    const r = await tx.repairRequest.create({
      data: {
        ref,
        customerId: linked?.id,
        name: data.name,
        phone,
        email: data.email || null,
        brand: data.brand,
        model: data.model,
        category: data.category,
        description: data.description,
        photos: JSON.stringify(photos),
        preferredAt,
        dropOff: data.dropOff,
      },
    });
    await tx.repairStatusChange.create({ data: { repairId: r.id, from: null, to: "NEW" } });
    return r;
  });

  await notify({ to: { phone, email: data.email || null }, subject: `Repair ${repair.ref}`, text: `PB Mobiles: your visit note is created. Repair reference ${repair.ref} for your ${data.brand} ${data.model}. Track it at pbmobiles.pk/repair/track` });
  await notifyStaff(`New repair ${repair.ref}`, `${data.name} (${phone}) — ${data.brand} ${data.model}: ${data.category}
${data.description}`);
  return NextResponse.json({ ref: repair.ref }, { status: 201 });
}
