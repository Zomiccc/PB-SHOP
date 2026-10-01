import type { SettingValue } from "./settings";

/**
 * Installment appointment slots (v6 §7). Pure — the shop runs on Pakistan time (UTC+5, no DST), so dates and
 * times are PKT and stored as UTC instants. A slot is full once `perSlot` active requests are booked in it.
 */

export type AppointmentRules = SettingValue<"installmentAppointments">;

const PKT_OFFSET = 5 * 3600_000;
const times = (spec: string) => [...new Set((spec ?? "").split(/[,\s]+/).filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))].sort();

/** "2026-10-05" + "15:00" (PKT) → the UTC instant. */
export function pktToDate(date: string, time: string) {
  const d = new Date(`${date}T${time}:00+05:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** UTC instant → { date: "2026-10-05", time: "15:00" } in PKT. */
export function dateToPkt(d: Date) {
  const iso = new Date(d.getTime() + PKT_OFFSET).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** "Mon 5 Oct, 3:00 pm" in PKT. */
export function formatPkt(d: Date) {
  return d.toLocaleString("en-PK", { timeZone: "Asia/Karachi", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** The slot times offered on a PKT date (Sunday has its own hours; closed dates have none). */
export function slotTimes(date: string, rules: AppointmentRules) {
  if (rules.closedDates.split(/[,\s]+/).includes(date)) return [];
  const weekday = new Date(`${date}T12:00:00+05:00`).getUTCDay();
  return times(weekday === 0 ? rules.sundaySlots : rules.slots);
}

/** Bookable dates from today (PKT) for the next `daysAhead` days that have at least one slot time. */
export function bookableDates(rules: AppointmentRules, now = new Date()) {
  const out: string[] = [];
  const today = dateToPkt(now).date;
  for (let i = 0; i <= rules.daysAhead; i++) {
    const date = new Date(new Date(`${today}T12:00:00+05:00`).getTime() + i * 86_400_000 + PKT_OFFSET).toISOString().slice(0, 10);
    if (slotTimes(date, rules).length) out.push(date);
  }
  return out;
}

/**
 * Every slot on a date with whether it can still be booked: not in the past / within the lead time,
 * inside the booking window, and not full. `booked` = active bookings per slot instant (ms).
 */
export function slotsFor(date: string, rules: AppointmentRules, booked: Map<number, number>, now = new Date()) {
  if (!bookableDates(rules, now).includes(date)) return [];
  const earliest = now.getTime() + rules.leadHours * 3600_000;
  return slotTimes(date, rules).map((time) => {
    const at = pktToDate(date, time)!;
    const taken = booked.get(at.getTime()) ?? 0;
    const full = taken >= Math.max(1, rules.perSlot);
    return { time, at: at.toISOString(), available: at.getTime() >= earliest && !full, full };
  });
}

/** "15:00" → "3:00 pm" */
export const timeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
