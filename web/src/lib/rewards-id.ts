import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Customer unique ID on the PB Rewards card (change request V2 §5): "PBM-" + a running number, at least four
 * digits (PBM-0001, PBM-0002, … PBM-9999, PBM-10000). Stored in `Customer.passportNo`; the barcode encodes it.
 * Older random numbers (PBP-123456) were renumbered once and are kept in `legacyNo`, so old cards still scan.
 */
export const REWARDS_ID_PREFIX = "PBM-";

export function formatRewardsId(n: number) {
  return `${REWARDS_ID_PREFIX}${String(n).padStart(4, "0")}`;
}

/** The running number inside a PBM- ID, or 0 for anything else. */
export function rewardsIdNumber(id: string | null | undefined) {
  const m = /^PBM-(\d+)$/.exec(id ?? "");
  return m ? Number(m[1]) : 0;
}

/** The next free customer ID. Call inside the transaction that creates the customer. */
export async function nextRewardsId(tx: Tx) {
  // IDs are issued in creation order, so the highest one is among the newest customers.
  const recent = await tx.customer.findMany({ where: { passportNo: { startsWith: REWARDS_ID_PREFIX } }, orderBy: { createdAt: "desc" }, take: 50, select: { passportNo: true } });
  let n = Math.max(0, ...recent.map((c) => rewardsIdNumber(c.passportNo))) + 1;
  for (let i = 0; i < 50; i++, n++) {
    const id = formatRewardsId(n);
    if (!(await tx.customer.findUnique({ where: { passportNo: id }, select: { id: true } }))) return id;
  }
  throw new Error("Could not allocate a Rewards ID — try again");
}

/** Finds a customer by their Rewards ID, also accepting the number printed on an older card. */
export function findByRewardsId<T extends Prisma.CustomerSelect>(tx: Tx, code: string, select: T) {
  const id = code.trim().toUpperCase();
  return tx.customer.findFirst({ where: { OR: [{ passportNo: id }, { legacyNo: id }] }, select });
}
