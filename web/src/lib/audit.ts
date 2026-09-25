import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

type Tx = PrismaClient | Prisma.TransactionClient;

export type AuditInput = {
  staffId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  recordLabel?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

/** Records a sensitive action for the super-admin audit log (§10, §16). Call inside the same transaction as the change. */
export async function audit(input: AuditInput, tx: Tx = db) {
  await tx.auditLog.create({
    data: {
      staffId: input.staffId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      recordLabel: input.recordLabel ?? null,
      before: input.before === undefined ? null : JSON.stringify(input.before),
      after: input.after === undefined ? null : JSON.stringify(input.after),
      ip: input.ip ?? null,
    },
  });
}
