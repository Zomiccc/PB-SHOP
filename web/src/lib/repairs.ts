import { db } from "./db";
import { audit } from "./audit";
import { getSetting } from "./settings";
import { notify } from "./notify";
import { REPAIR_STATUSES } from "./constants";

const VALID = new Set<string>([...REPAIR_STATUSES.map((s) => s.key), "CANCELLED"]);

/**
 * Move a repair through New → Received → Diagnosing → Awaiting → Repairing → Ready → Completed (§8).
 * Logs history + audit, awards repair loyalty points on completion (once), and notifies the customer.
 */
export async function changeRepairStatus(repairId: string, to: string, staffId: string) {
  if (!VALID.has(to)) throw new Error("Unknown status");
  const loyalty = await getSetting("loyalty");
  const repair = await db.$transaction(async (tx) => {
    const r = await tx.repairRequest.findUniqueOrThrow({ where: { id: repairId } });
    if (r.status === to) return r;
    const updated = await tx.repairRequest.update({
      where: { id: repairId },
      data: { status: to, completedAt: to === "COMPLETED" ? new Date() : to === r.status ? r.completedAt : null },
    });
    await tx.repairStatusChange.create({ data: { repairId, from: r.status, to, staffId } });
    await audit({ staffId, action: "REPAIR_STATUS_CHANGED", entityType: "REPAIR", entityId: repairId, recordLabel: `Repair ${r.ref}`, before: { status: r.status }, after: { status: to } }, tx);

    if (to === "COMPLETED" && r.customerId && loyalty.repairPoints > 0) {
      const already = await tx.loyaltyTransaction.findFirst({ where: { repairId, type: "EARN" } });
      if (!already) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + loyalty.expiryMonths);
        await tx.loyaltyTransaction.create({ data: { customerId: r.customerId, type: "EARN", points: loyalty.repairPoints, repairId, reason: `Repair ${r.ref}`, staffId, expiresAt } });
        await tx.customer.update({ where: { id: r.customerId }, data: { loyaltyPoints: { increment: loyalty.repairPoints } } });
      }
    }
    return updated;
  });

  const label = REPAIR_STATUSES.find((s) => s.key === to)?.label ?? to;
  if (["RECEIVED", "AWAITING", "READY", "COMPLETED"].includes(to)) {
    await notify({
      to: { phone: repair.phone, email: repair.email },
      subject: `Repair ${repair.ref}: ${label}`,
      text: `PB Mobiles: your ${repair.brand} ${repair.model} (repair ${repair.ref}) is now "${label}".${to === "READY" ? " It's ready to collect." : ""}${to === "AWAITING" && repair.quote ? ` Quote: Rs ${repair.quote}. Please reply to approve.` : ""}`,
    });
  }
  return repair;
}
