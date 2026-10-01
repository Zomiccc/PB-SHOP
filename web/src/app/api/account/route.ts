import { NextResponse } from "next/server";
import { isPkMobile, normalizePhone } from "@/lib/format";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { clearCustomerSession, setCustomerSession, uniquePassportNo } from "@/lib/auth";
import { PassportError, findReferrer, joinPassport, parseBirthday } from "@/lib/passport";

const norm = normalizePhone; // +92 / 92 / 0 forms are the same number — one account per phone

const Register = z.object({
  action: z.literal("register"),
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string({ message: "Enter your mobile number" }).trim().min(1, "Enter your mobile number").refine(isPkMobile, "Enter a valid Pakistani mobile number, e.g. 0300 1234567"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  // Birthday: month + day only — the year is not asked for (Passport requirements §2).
  birthMonth: z.coerce.number({ message: "Choose your birth month" }).int().min(1, "Choose your birth month").max(12),
  birthDay: z.coerce.number({ message: "Enter the day" }).int().min(1, "Enter the day").max(31, "Enter the day"),
  referral: z.string().trim().max(40).optional(), // friend's Passport ID or mobile number
  proof: z.string().trim().optional(), // order number or repair ref, required to claim an existing guest profile
});
const Login = z.object({ action: z.literal("login"), phone: z.string().trim().min(5), password: z.string().min(1) });
const Body = z.discriminatedUnion("action", [Register, Login, z.object({ action: z.literal("logout") })]);

/**
 * Customer accounts (§10 secure accounts). Passwords are bcrypt-hashed.
 * Guest profiles created at checkout/POS can be claimed with proof of a past order or repair.
 * A new member's welcome reward and their referrer's reward are credited on the member's first purchase
 * or repair (src/lib/passport.ts); claiming a guest profile (with proof of a past visit) credits the
 * welcome reward at once.
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
  let birthday: { birthMonth: number; birthDay: number } | null;
  try {
    birthday = parseBirthday(d.birthMonth, d.birthDay, { required: true });
  } catch (e) {
    if (e instanceof PassportError) return NextResponse.json({ error: e.message, fields: { birthDay: [e.message] } }, { status: 422 });
    throw e;
  }
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
    // An existing customer claiming their profile isn't new, so a referral code doesn't apply here.
    await db.$transaction(async (tx) => {
      await tx.customer.update({ where: { id: existing.id }, data: { name: d.name, email: d.email || existing.email, passwordHash: hash, ...birthday } });
      await joinPassport(tx, existing.id, { verified: true }); // proof of a past order / repair = verified
    });
    await setCustomerSession(existing.id);
    return NextResponse.json({ ok: true, claimed: true });
  }

  if (d.email && (await db.customer.findUnique({ where: { email: d.email } }))) {
    return NextResponse.json({ error: "That email is already in use", fields: { email: ["Already in use"] } }, { status: 409 });
  }
  let referrerId: string | null = null;
  try {
    referrerId = (await findReferrer(db, d.referral, phone))?.id ?? null;
  } catch (e) {
    if (e instanceof PassportError) return NextResponse.json({ error: e.message, fields: { referral: [e.message] } }, { status: 422 });
    throw e;
  }
  const c = await db.$transaction(async (tx) => {
    const c = await tx.customer.create({ data: { name: d.name, phone, email: d.email || null, passwordHash: hash, passportNo: await uniquePassportNo(tx), referredById: referrerId, ...birthday } });
    await joinPassport(tx, c.id); // welcome reward waits for their first purchase or repair
    return c;
  });
  await setCustomerSession(c.id);
  return NextResponse.json({ ok: true });
}
