import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/format";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/staff";

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone"));
  if (phone.length < 10) return NextResponse.json({ found: false });
  const c = await db.customer.findUnique({ where: { phone } });
  if (!c) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, id: c.id, name: c.name, passportNo: c.passportNo, points: c.loyaltyPoints });
}
