/**
 * PB Mobiles Developer Requirements v6 (final): broadcasts with media, appointment slots, 30% installments,
 * final PB Points rewards & reversal rules, large media uploads.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { activeBroadcasts, parseMedia } from "@/lib/broadcasts";
import { bookableDates, dateToPkt, pktToDate, slotsFor, slotTimes, timeLabel } from "@/lib/appointments";
import { AppointmentError, createInstallmentRequest } from "@/lib/installment-requests";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { changeRepairStatus } from "@/lib/repairs";
import { spendPoints } from "@/lib/loyalty";
import { CHUNK_SIZE, finishUpload, MediaUploadError, putChunk, sniffMedia, startUpload } from "@/lib/media-upload";
import { makeCustomer, makeRepair, makeStaff } from "./helpers";

const rules = SETTING_DEFAULTS.installmentAppointments;

describe("Broadcasts with pictures and videos (§1–§2)", () => {
  it("only accepts media uploaded through the dashboard", () => {
    const media = parseMedia(JSON.stringify([
      { url: "/api/media/abc123", type: "IMAGE" },
      { url: "/api/media/vid_9", type: "VIDEO" },
      { url: "/uploads/broadcasts/x.jpg", type: "IMAGE" },
      { url: "https://evil.example/x.mp4", type: "VIDEO" },
      { url: "javascript:alert(1)", type: "IMAGE" },
      { url: "/api/media/ok", type: "AUDIO" },
    ]));
    expect(media.map((m) => m.url)).toEqual(["/api/media/abc123", "/api/media/vid_9", "/uploads/broadcasts/x.jpg"]);
    expect(parseMedia("not json")).toEqual([]);
  });
  it("shows every live broadcast (newest first) with its media", async () => {
    const id = Date.now().toString(36);
    const now = new Date();
    await db.broadcast.create({ data: { message: `older ${id}`, active: true, startsAt: new Date(now.getTime() - 7200_000), media: JSON.stringify([{ url: "/api/media/a1", type: "IMAGE" }]) } });
    await db.broadcast.create({ data: { message: `newer ${id}`, active: true, startsAt: new Date(now.getTime() - 3600_000) } });
    await db.broadcast.create({ data: { message: `draft ${id}`, active: false } });
    const mine = (await activeBroadcasts(now)).filter((b) => b.message.endsWith(id));
    expect(mine.map((b) => b.message)).toEqual([`newer ${id}`, `older ${id}`]);
    expect(mine[1].media).toEqual([{ url: "/api/media/a1", type: "IMAGE" }]);
  });
});

describe("Installment appointments (§7)", () => {
  it("converts Pakistan time both ways", () => {
    const d = pktToDate("2026-10-05", "15:00")!;
    expect(d.toISOString()).toBe("2026-10-05T10:00:00.000Z");
    expect(dateToPkt(d)).toEqual({ date: "2026-10-05", time: "15:00" });
    expect(timeLabel("15:00")).toBe("3:00 pm");
    expect(timeLabel("11:30")).toBe("11:30 am");
  });
  it("uses Sunday hours and closed dates", () => {
    expect(slotTimes("2026-10-04", rules)[0]).toBe("14:00"); // Sunday
    expect(slotTimes("2026-10-05", rules)[0]).toBe("11:00"); // Monday
    expect(slotTimes("2026-10-05", { ...rules, closedDates: "2026-10-05" })).toEqual([]);
  });
  it("offers dates from today, and hides past / too-soon / full slots", () => {
    const now = new Date("2026-10-05T09:30:00+05:00"); // Monday 9:30 am PKT
    const dates = bookableDates(rules, now);
    expect(dates[0]).toBe("2026-10-05");
    expect(dates).toHaveLength(rules.daysAhead + 1);
    const at = (t: string) => pktToDate("2026-10-05", t)!.getTime();
    const slots = slotsFor("2026-10-05", rules, new Map([[at("14:00"), rules.perSlot]]), now);
    expect(slots.find((s) => s.time === "11:00")!.available).toBe(false); // within the 2-hour notice
    expect(slots.find((s) => s.time === "12:00")!.available).toBe(true);
    expect(slots.find((s) => s.time === "14:00")).toMatchObject({ available: false, full: true });
    expect(slotsFor("2026-12-30", rules, new Map(), now)).toEqual([]); // outside the booking window
  });
  it("books a slot, refuses it once full, and frees it when cancelled", async () => {
    const tomorrow = bookableDates(rules)[1];
    const time = slotTimes(tomorrow, rules).at(-1)!;
    const at = pktToDate(tomorrow, time)!;
    // Clear this slot in the shared test database.
    await db.installmentRequest.deleteMany({ where: { appointmentAt: at } });
    const base = String(Date.now() % 1e6).padStart(6, "0");
    const phone = (n: number) => `0333${base}${n}`;
    const book = (n: number) => createInstallmentRequest({ name: `Test ${n}`, phone: phone(n), phoneModel: "Galaxy A55", date: tomorrow, time });
    const made = [];
    for (let n = 0; n < rules.perSlot; n++) made.push(await book(n));
    expect(made[0].ref).toMatch(/^PBA-\d+$/);
    await expect(book(8)).rejects.toBeInstanceOf(AppointmentError); // full
    await db.installmentRequest.update({ where: { id: made[0].id }, data: { status: "CANCELLED" } });
    await expect(book(9)).resolves.toMatchObject({ appointmentAt: at });
    // One upcoming appointment per phone, even at a different time.
    const other = slotTimes(tomorrow, rules).at(-2)!;
    await expect(createInstallmentRequest({ name: "Test 9", phone: phone(9), phoneModel: "Galaxy A55", date: tomorrow, time: other })).rejects.toThrow(/already have an upcoming/);
  });
});

describe("Final PB Points rules", () => {
  it("defaults: 30% minimum down payment; installment booking on", () => {
    expect(SETTING_DEFAULTS.installmentCalc.minDownPaymentPercent).toBe(30);
    expect(SETTING_DEFAULTS.installmentCalc.downPaymentOptions).toBe("30,40,50");
    expect(SETTING_DEFAULTS.installmentAppointments.enabled).toBe(true);
  });
  it("a repair cancelled after completion has its points reversed — redeemed points are not restored", async () => {
    const staff = await makeStaff();
    const c = await makeCustomer();
    const r = await db.repairRequest.update({ where: { id: (await makeRepair(c.id)).id }, data: { finalPrice: 5000 } });
    await changeRepairStatus(r.id, "COMPLETED", staff.id); // Rs 5,000 → 50 points
    expect((await db.customer.findUniqueOrThrow({ where: { id: c.id } })).loyaltyPoints).toBe(50);
    await db.$transaction((tx) => spendPoints(tx, { customerId: c.id, points: 50, type: "REDEEM", reason: "Free Screen Protector" }));
    await changeRepairStatus(r.id, "CANCELLED", staff.id);
    await changeRepairStatus(r.id, "CANCELLED", staff.id);
    const after = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.loyaltyPoints).toBe(0); // never negative
    const redeemed = await db.loyaltyTransaction.findFirstOrThrow({ where: { customerId: c.id, type: "REDEEM" } });
    expect(redeemed.points).toBe(-50); // the redemption stands
  });
});

describe("Large media uploads in pieces (broadcast videos)", () => {
  it("checks the real file type", () => {
    expect(sniffMedia(Buffer.from([0, 0, 0, 0x20, ...Buffer.from("ftypisom")]), "video/mp4")).toBe(true);
    expect(sniffMedia(Buffer.from("not a video at all"), "video/mp4")).toBe(false);
  });
  it("assembles a multi-piece upload and serves it in order", async () => {
    const size = CHUNK_SIZE + 10;
    const body = Buffer.alloc(size, 7);
    Buffer.from([0, 0, 0, 0x20, ...Buffer.from("ftypisom")]).copy(body, 0);
    const { id, chunks } = await startUpload({ fileName: "promo.mp4", mimeType: "video/mp4", size, folder: "broadcasts" });
    expect(chunks).toBe(2);
    await expect(finishUpload(id)).rejects.toBeInstanceOf(MediaUploadError); // pieces missing
    await expect(putChunk(id, 1, body.subarray(CHUNK_SIZE, CHUNK_SIZE + 5))).rejects.toBeInstanceOf(MediaUploadError); // wrong size
    await putChunk(id, 0, body.subarray(0, CHUNK_SIZE));
    await putChunk(id, 1, body.subarray(CHUNK_SIZE));
    expect(await finishUpload(id)).toEqual({ url: `/api/media/${id}`, type: "VIDEO" });
    const parts = await db.mediaChunk.findMany({ where: { mediaId: id }, orderBy: { idx: "asc" } });
    expect(Buffer.concat(parts.map((p) => Buffer.from(p.data))).equals(body)).toBe(true);
  });
  it("rejects unsupported types and oversized files", async () => {
    await expect(startUpload({ fileName: "x.exe", mimeType: "application/x-msdownload", size: 10, folder: "broadcasts" })).rejects.toBeInstanceOf(MediaUploadError);
    await expect(startUpload({ fileName: "big.mp4", mimeType: "video/mp4", size: 200 * 1024 * 1024, folder: "broadcasts" })).rejects.toBeInstanceOf(MediaUploadError);
  });
});
