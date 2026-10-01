import { db } from "./db";
import { getSetting } from "./settings";
import { pktToDate, slotsFor } from "./appointments";
import { normalizePhone } from "./format";
import { audit } from "./audit";

/** Statuses that hold a slot (a cancelled request frees its place). */
const HOLDS_SLOT = ["NEW", "CONFIRMED"];

export class AppointmentError extends Error {}

/** Active bookings per slot instant on one PKT date. */
export async function bookedOn(date: string) {
  const from = pktToDate(date, "00:00");
  if (!from) return new Map<number, number>();
  const rows = await db.installmentRequest.groupBy({
    by: ["appointmentAt"],
    where: { status: { in: HOLDS_SLOT }, appointmentAt: { gte: from, lt: new Date(from.getTime() + 86_400_000) } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.appointmentAt.getTime(), r._count._all]));
}

/** Admin list: requests still to handle, plus anything booked in the last week. */
export function recentInstallmentRequests(now = new Date()) {
  return db.installmentRequest.findMany({ where: { OR: [{ appointmentAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } }, { status: "NEW" }] }, orderBy: { appointmentAt: "asc" }, take: 100 });
}

export async function availableSlots(date: string) {
  const rules = await getSetting("installmentAppointments");
  return slotsFor(date, rules, await bookedOn(date));
}

export type RequestInput = {
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  phoneModel: string;
  listingId?: string | null;
  price?: number | null;
  downPercent?: number | null;
  terms?: number | null;
  perInstallment?: number | null;
  date: string;
  time: string;
  notes?: string | null;
};

/** Books the appointment if the slot is still open (checked again inside the transaction). */
export async function createInstallmentRequest(input: RequestInput) {
  const rules = await getSetting("installmentAppointments");
  if (!rules.enabled) throw new AppointmentError("Online booking is closed — please call or visit us.");
  const phone = normalizePhone(input.phone);
  return db.$transaction(async (tx) => {
    const booked = new Map<number, number>();
    const from = pktToDate(input.date, "00:00");
    if (from) {
      const rows = await tx.installmentRequest.groupBy({ by: ["appointmentAt"], where: { status: { in: HOLDS_SLOT }, appointmentAt: { gte: from, lt: new Date(from.getTime() + 86_400_000) } }, _count: { _all: true } });
      rows.forEach((r) => booked.set(r.appointmentAt.getTime(), r._count._all));
    }
    const slot = slotsFor(input.date, rules, booked).find((s) => s.time === input.time);
    if (!slot) throw new AppointmentError("Choose an available date and time");
    if (!slot.available) throw new AppointmentError(slot.full ? "Sorry — that time was just booked. Please choose another." : "That time is no longer available. Please choose another.");
    if (await tx.installmentRequest.findFirst({ where: { phone, status: { in: HOLDS_SLOT }, appointmentAt: { gte: new Date() } } })) {
      throw new AppointmentError("You already have an upcoming installment appointment. Call us to change it.");
    }
    const customer = await tx.customer.findUnique({ where: { phone }, select: { id: true } });
    // Next free reference (robust even if rows were ever removed).
    let n = 1001 + (await tx.installmentRequest.count());
    while (await tx.installmentRequest.findUnique({ where: { ref: `PBA-${n}` }, select: { id: true } })) n++;
    const r = await tx.installmentRequest.create({
      data: {
        ref: `PBA-${n}`,
        name: input.name,
        phone,
        email: input.email || null,
        city: input.city || null,
        phoneModel: input.phoneModel,
        listingId: input.listingId || null,
        price: input.price ?? null,
        downPercent: input.downPercent ?? null,
        terms: input.terms ?? null,
        perInstallment: input.perInstallment ?? null,
        appointmentAt: new Date(slot.at),
        notes: input.notes || null,
        customerId: customer?.id ?? null,
      },
    });
    await audit({ action: "INSTALLMENT_APPOINTMENT_BOOKED", entityType: "INSTALLMENT", entityId: r.id, recordLabel: `${r.ref} · ${r.phoneModel}`, after: { appointmentAt: r.appointmentAt, plan: { price: r.price, downPercent: r.downPercent, terms: r.terms } } }, tx);
    return r;
  });
}
