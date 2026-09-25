import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Uptime-monitor endpoint: checks the app and database are reachable. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
