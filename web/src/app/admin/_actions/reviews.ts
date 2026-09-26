"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import type { FormState } from "./auth";
import { run, str } from "./util";

/** Approve / reject / delete a customer review (moderation, master brief §17). */
export async function moderateReviewAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const id = str(f, "id");
    const decision = str(f, "decision");
    const r = await db.review.findUniqueOrThrow({ where: { id } });
    if (decision === "DELETE") {
      await db.review.delete({ where: { id } });
      await audit({ staffId: staff.id, action: "REVIEW_DELETED", entityType: "REVIEW", entityId: id, recordLabel: `Review by ${r.customerName}`, before: { rating: r.rating, body: r.body.slice(0, 200) } });
    } else {
      if (!["APPROVED", "REJECTED"].includes(decision)) throw new Error("Invalid decision");
      await db.review.update({ where: { id }, data: { status: decision, moderatedBy: staff.id, moderatedAt: new Date() } });
      await audit({ staffId: staff.id, action: decision === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED", entityType: "REVIEW", entityId: id, recordLabel: `Review by ${r.customerName}`, before: { status: r.status }, after: { status: decision } });
    }
    revalidatePath("/admin/reviews");
    revalidatePath("/");
    return decision === "DELETE" ? "Review deleted" : decision === "APPROVED" ? "Approved — now visible on the website" : "Rejected — hidden from the website";
  });
}
