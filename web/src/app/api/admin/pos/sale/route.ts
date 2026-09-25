import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaff } from "@/lib/staff";
import { createPosSale, PosError } from "@/lib/pos";

const Sale = z.object({
  items: z.array(z.object({ variantId: z.string(), qty: z.number().int().min(1).max(50) })).min(1),
  method: z.enum(["CASH", "CARD", "MOBILE_WALLET", "BANK_TRANSFER"]),
  customerPhone: z.string().trim().max(20).optional(),
  customerName: z.string().trim().max(80).optional(),
  note: z.string().max(2000).optional(),
  discount: z.number().int().min(0).optional(),
  override: z.object({ email: z.string().optional(), password: z.string().optional() }).optional(),
});

export async function POST(req: Request) {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Sale.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sale" }, { status: 400 });
  if (parsed.data.customerPhone && !/^(\+92|0)?3\d{2}[\s-]?\d{7}$/.test(parsed.data.customerPhone)) {
    return NextResponse.json({ error: "Customer phone looks invalid" }, { status: 422 });
  }
  try {
    const order = await createPosSale(parsed.data, staff);
    return NextResponse.json({ orderId: order.id, number: order.number, total: order.total, careCard: order.careCard?.number ?? null });
  } catch (e) {
    if (e instanceof PosError) return NextResponse.json({ error: e.message, needsOverride: /zero-stock|only \d+ in stock/i.test(e.message) }, { status: 409 });
    throw e;
  }
}
