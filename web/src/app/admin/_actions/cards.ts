"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { uniquePassportNo } from "@/lib/auth";
import type { FormState } from "./auth";
import { run, str } from "./util";

const PHONE_RX = /^(\+92|0)?3\d{9}$/;
const tidy = (s: string) => s.replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Card generator: first name + last name + mobile → a PB Phone Passport with a unique ID, then the
 * printable card. If the mobile already has a Passport, that existing card is opened (one per person).
 */
export async function generateCardAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let customerId: string | null = null;
  const res = await run(async () => {
    const first = tidy(str(f, "firstName"));
    const last = tidy(str(f, "lastName"));
    const phone = str(f, "phone").replace(/[\s-]/g, "");
    if (first.length < 2) throw new Error("Enter the first name");
    if (last.length < 1) throw new Error("Enter the last name");
    if (!PHONE_RX.test(phone)) throw new Error("Enter a valid mobile number, e.g. 0300 1234567");
    const existing = await db.customer.findUnique({ where: { phone } });
    if (existing) {
      customerId = existing.id;
      return;
    }
    const c = await db.$transaction(async (tx) => {
      const c = await tx.customer.create({ data: { name: `${first} ${last}`, phone, passportNo: await uniquePassportNo(tx) } });
      await audit({ staffId: staff.id, action: "PASSPORT_CARD_ISSUED", entityType: "CUSTOMER", entityId: c.id, recordLabel: `${c.name} (${c.passportNo})`, after: { name: c.name, passportNo: c.passportNo } }, tx);
      return c;
    });
    customerId = c.id;
  });
  if (customerId) redirect(`/admin/customers/${customerId}/card`);
  return res;
}
