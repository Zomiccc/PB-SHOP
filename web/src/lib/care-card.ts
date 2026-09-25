import { db } from "./db";
import { audit } from "./audit";
import { getSetting } from "./settings";

export class CareCardError extends Error {}

/**
 * Redeem one Care Card service (§18).
 *  - max uses per card (default 5); card becomes EXHAUSTED on the last use
 *  - a service can't be redeemed twice on the same card unless the super admin enables repeats
 *  - only active, configured services can be redeemed
 *  - every redemption records customer, date/time, employee, service and card number
 */
export async function redeemCareService(input: { cardId: string; serviceId: string; staffId: string; repairId?: string | null; note?: string | null }) {
  const rules = await getSetting("careCard");
  return db.$transaction(async (tx) => {
    const card = await tx.careCard.findUnique({ where: { id: input.cardId }, include: { redemptions: true, customer: true } });
    if (!card) throw new CareCardError("Care Card not found");
    if (card.status !== "ACTIVE") throw new CareCardError(`This Care Card is ${card.status.toLowerCase()}`);
    const max = card.maxUses || rules.maxUses;
    if (card.redemptions.length >= max) throw new CareCardError("All uses on this card have been redeemed");

    const service = await tx.careCardService.findUnique({ where: { id: input.serviceId } });
    if (!service || !service.active || !service.configured) throw new CareCardError("That service is not currently available");
    if (!rules.allowRepeatService && card.redemptions.some((r) => r.serviceId === service.id)) {
      throw new CareCardError(`"${service.name}" has already been redeemed on this card`);
    }

    const r = await tx.careCardRedemption.create({
      data: { careCardId: card.id, serviceId: service.id, customerId: card.customerId, staffId: input.staffId, repairId: input.repairId ?? null, note: input.note ?? null },
    });
    const used = card.redemptions.length + 1;
    if (used >= max) await tx.careCard.update({ where: { id: card.id }, data: { status: "EXHAUSTED" } });

    await audit(
      {
        staffId: input.staffId,
        action: "CARE_CARD_REDEEMED",
        entityType: "CARE_CARD",
        entityId: card.id,
        recordLabel: `${card.number} · ${service.name}`,
        after: { customer: card.customer.name, service: service.name, use: `${used}/${max}`, repairId: input.repairId ?? null },
      },
      tx,
    );
    return { redemption: r, used, max, exhausted: used >= max };
  });
}
