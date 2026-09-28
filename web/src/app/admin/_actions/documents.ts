"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { filesFrom, inspectUpload, MAX_FILES_PER_FORM, saveAttachment, type AttachmentKind, type AttachmentLinks } from "@/lib/attachments";
import type { FormState } from "./auth";
import { run, str } from "./util";

const TARGETS = {
  repair: { field: "repairId", path: (id: string) => `/admin/repairs/${id}`, label: "REPAIR" },
  installment: { field: "installmentSaleId", path: (id: string) => `/admin/installments/sales/${id}`, label: "INSTALLMENT" },
  used: { field: "usedPurchaseId", path: (id: string) => `/admin/used-phones/${id}`, label: "USED_PURCHASE" },
  contact: { field: "contactMessageId", path: () => "/admin/inbox", label: "CONTACT" },
} as const;

/** Staff add supporting documents to an existing record (repair, installment sale, used-phone purchase, message). */
export async function uploadAttachmentsAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const target = TARGETS[str(f, "target") as keyof typeof TARGETS];
    const id = str(f, "id");
    if (!target || !id) throw new Error("Unknown record");
    const requested = str(f, "kind");
    const kind: AttachmentKind = requested === "CNIC_FRONT" || requested === "CNIC_BACK" || requested === "PHOTO" ? requested : "OTHER";
    const files = filesFrom(f, "files").slice(0, MAX_FILES_PER_FORM);
    if (!files.length) throw new Error("Choose at least one file");
    for (const file of files) await inspectUpload(file, kind);
    const links = { [target.field]: id } as AttachmentLinks;
    await db.$transaction(async (tx) => {
      for (const file of files) await saveAttachment(file, { kind, uploadedById: staff.id, ...links }, tx);
      await audit({ staffId: staff.id, action: "DOCUMENTS_UPLOADED", entityType: target.label, entityId: id, after: { kind, files: files.map((x) => x.name) } }, tx);
    });
    revalidatePath(target.path(id));
    return `${files.length} file${files.length > 1 ? "s" : ""} attached`;
  });
}

/** Removes a document. ID documents can only be removed by the owner (Super Admin). Always audited. */
export async function deleteAttachmentAction(_: FormState, f: FormData): Promise<FormState> {
  const staff = await requireStaff();
  return run(async () => {
    const a = await db.attachment.findUniqueOrThrow({ where: { id: str(f, "id") } });
    if (a.sensitive && staff.role !== "SUPER_ADMIN") throw new Error("Only the owner can remove ID documents");
    await db.$transaction(async (tx) => {
      await tx.attachment.delete({ where: { id: a.id } });
      await audit({ staffId: staff.id, action: "DOCUMENT_DELETED", entityType: "ATTACHMENT", entityId: a.id, recordLabel: `${a.kind} · ${a.fileName}`, before: { repairId: a.repairId, installmentSaleId: a.installmentSaleId, usedPurchaseId: a.usedPurchaseId } }, tx);
    });
    if (a.repairId) revalidatePath(`/admin/repairs/${a.repairId}`);
    if (a.installmentSaleId) revalidatePath(`/admin/installments/sales/${a.installmentSaleId}`);
    if (a.usedPurchaseId) revalidatePath(`/admin/used-phones/${a.usedPurchaseId}`);
    return "File removed";
  });
}
