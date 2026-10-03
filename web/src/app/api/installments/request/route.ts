import { isApplePhone } from "@/lib/brands";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { isPkMobile } from "@/lib/format";
import { AppointmentError, createInstallmentRequest } from "@/lib/installment-requests";
import { formatPkt } from "@/lib/appointments";
import { notify, notifyStaff } from "@/lib/notify";
import { BRAND } from "@/lib/constants";

const Body = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string({ message: "Enter your mobile number" }).trim().refine(isPkMobile, "Enter a valid Pakistani mobile number, e.g. 0300 1234567"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  city: z.string().trim().max(60).optional(),
  phoneModel: z.string().trim().min(2, "Which phone would you like?").max(120).refine((m) => !isApplePhone(m), "We don't offer installments on iPhone — choose another phone"),
  listingId: z.string().max(40).optional(),
  price: z.number().int().positive().max(5_000_000).optional(),
  downPercent: z.number().int().min(0).max(100).optional(),
  terms: z.number().int().min(1).max(104).optional(),
  perInstallment: z.number().int().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  notes: z.string().trim().max(500).optional(),
  agree: z.literal(true, { message: "Please confirm you'll bring your original CNIC" }),
});

/**
 * Installment request + store appointment (v6 §7). No CNIC is collected online — the customer brings it to the
 * appointment, where the purchase is completed (master brief §3).
 */
export async function POST(req: Request) {
  if (!rateLimit(`inst-req:${ipFrom(req)}`, 5, 600_000).ok) return NextResponse.json({ error: "Too many requests — please try again in a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  try {
    const r = await createInstallmentRequest(parsed.data);
    const when = formatPkt(r.appointmentAt);
    await notify({ to: { phone: r.phone, email: r.email }, subject: `Installment appointment ${r.ref}`, text: `PB Mobiles: your installment appointment for ${r.phoneModel} is booked for ${when} (ref ${r.ref}). Please bring your original CNIC. ${BRAND.address}` }).catch(() => {});
    await notifyStaff(`New installment appointment ${r.ref}`, `${r.name} (${r.phone}) booked ${when} for ${r.phoneModel}.`).catch(() => {});
    return NextResponse.json({ ok: true, ref: r.ref, when, phoneModel: r.phoneModel });
  } catch (e) {
    if (e instanceof AppointmentError) return NextResponse.json({ error: e.message, fields: { time: [e.message] } }, { status: 409 });
    throw e;
  }
}
