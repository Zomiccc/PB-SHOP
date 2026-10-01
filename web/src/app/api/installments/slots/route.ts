import { NextResponse } from "next/server";
import { availableSlots } from "@/lib/installment-requests";

/** Open appointment times on a date (PKT), with full / past ones marked unavailable (v6 §7). */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Choose a date" }, { status: 400 });
  return NextResponse.json({ date, slots: await availableSlots(date) }, { headers: { "Cache-Control": "no-store" } });
}
