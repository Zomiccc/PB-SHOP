import { NextResponse } from "next/server";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { clearCustomerSession, newPassportNo, setCustomerSession } from "@/lib/auth";

const phoneRx = /^(\+92|0)?3\d{2}[\s-]?\d{7}$/;
const norm = (p: string) => p.replace(/[\s-]/g, "");

const Register = z.object({
  action: z.literal("register"),
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().regex(phoneRx, "Enter a valid Pakistani mobile number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  proof: z.string().trim().optional(), // order number or repair ref, required to claim an existing guest profile
});
const Login = z.object({ action: z.literal("login"), phone: z.string().trim().min(5), password: z.string().min(1) });
const Body = z.discriminatedUnion("action", [Register, Login, z.object({ action: z.literal("logout") })]);

/**
 * Customer accounts (§10 secure accounts). Passwords are bcrypt-hashed.
 * Guest profiles created at checkout/POS can be claimed with proof of a past order or repair.
 * TODO(phase 2): replace `proof` with SMS OTP verification once an SMS provider is chosen.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  const d = parsed.data;

  if (d.action === "logout") {
    await clearCustomerSession();
    return NextResponse.json({ ok: true });
  }

  if (!rateLimit(`account:${d.action}:${ipFrom(req)}`, 10, 15 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts — please wait 15 minutes." }, { status: 429 });
  }

  if (d.action === "login") {
    const c = await db.customer.findUnique({ where: { phone: norm(d.phone) } });
    const ok = c?.passwordHash ? await bcrypt.compare(d.password, c.passwordHash) : false;
    if (!c || !ok) return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
    await setCustomerSession(c.id);
    return NextResponse.json({ ok: true });
  }

  const phone = norm(d.phone);
  const hash = await bcrypt.hash(d.password, 10);
  const existing = await db.customer.findUnique({ where: { phone }, include: { orders: { select: { number: true } }, repairs: { select: { ref: true } } } });

  if (existing?.passwordHash) return NextResponse.json({ error: "An account with this number already exists — please log in", fields: { phone: ["Already registered"] } }, { status: 409 });

  if (existing) {
    const proof = (d.proof ?? "").toUpperCase();
    const valid = existing.orders.some((o) => o.number === proof) || existing.repairs.some((r) => r.ref === proof);
    if (!valid) {
      return NextResponse.json(
        { error: "We found a Passport for this number. Enter an order number (PB-…) or repair reference (PBR-…) from a past visit to claim it.", needsProof: true, fields: { proof: ["Required to claim your existing Passport"] } },
        { status: 409 },
      );
    }
    await db.customer.update({ where: { id: existing.id }, data: { name: d.name, email: d.email || existing.email, passwordHash: hash } });
    await setCustomerSession(existing.id);
    return NextResponse.json({ ok: true, claimed: true });
  }

  if (d.email && (await db.customer.findUnique({ where: { email: d.email } }))) {
    return NextResponse.json({ error: "That email is already in use", fields: { email: ["Already in use"] } }, { status: 409 });
  }
  const c = await db.customer.create({ data: { name: d.name, phone, email: d.email || null, passwordHash: hash, passportNo: newPassportNo() } });
  await setCustomerSession(c.id);
  return NextResponse.json({ ok: true });
}
