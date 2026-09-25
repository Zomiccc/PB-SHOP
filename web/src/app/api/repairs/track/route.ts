import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Public repair status lookup — requires the reference AND the phone number used to book, for privacy. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim().toUpperCase();
  const phone = (url.searchParams.get("phone") ?? "").replace(/[\s-]/g, "");
  if (!ref || !phone) return NextResponse.json({ error: "Enter your repair reference and phone number" }, { status: 400 });

  const r = await db.repairRequest.findUnique({
    where: { ref },
    include: { statusChanges: { orderBy: { createdAt: "asc" } } },
  });
  const last7 = (s: string) => s.slice(-7);
  if (!r || last7(r.phone) !== last7(phone)) {
    return NextResponse.json({ error: "We couldn't find a repair with those details" }, { status: 404 });
  }
  return NextResponse.json({
    ref: r.ref,
    device: `${r.brand} ${r.model}`,
    status: r.status,
    quote: r.quote,
    createdAt: r.createdAt,
    history: r.statusChanges.map((s) => ({ to: s.to, at: s.createdAt })),
  });
}
