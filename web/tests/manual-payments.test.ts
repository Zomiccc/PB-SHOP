/**
 * Manual payments (client request, 9 Oct 2026): Easypaisa / JazzCash / Faysal Bank, receipt upload, staff review.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MANUAL_METHODS, PAYMENT_ACCOUNTS, PAYMENT_STATUS_LABEL, isManualMethod } from "@/lib/payment-accounts";
import { inspectUpload } from "@/lib/attachments";
import { BRAND_ACCESSORIES } from "../prisma/brand-accessories";
import { ACCESSORY_WARRANTY, USED_WARRANTY } from "@/lib/constants";

describe("Manual payment options", () => {
  it("offers exactly Easypaisa, JazzCash and Faysal Bank", () => {
    expect([...MANUAL_METHODS]).toEqual(["EASYPAISA", "JAZZCASH", "FAYSAL"]);
    expect(isManualMethod("JAZZCASH")).toBe(true);
    expect(isManualMethod("COD")).toBe(false);
  });

  it("Easypaisa has no QR (copy the number); JazzCash and Faysal show their QR, and the files exist", () => {
    expect(PAYMENT_ACCOUNTS.EASYPAISA.qr).toBeNull();
    expect(PAYMENT_ACCOUNTS.EASYPAISA.details.map((d) => d.value)).toContain("03346888696");
    for (const m of ["JAZZCASH", "FAYSAL"] as const) {
      const qr = PAYMENT_ACCOUNTS[m].qr!;
      expect(fs.existsSync(path.join(__dirname, "..", "public", qr))).toBe(true);
    }
    expect(PAYMENT_ACCOUNTS.FAYSAL.details.find((d) => d.label === "IBAN")?.value).toBe("PK16FAYS3313701000004501");
    expect(PAYMENT_ACCOUNTS.JAZZCASH.details.find((d) => d.label === "IBAN")?.value).toBe("PK92JCMA0910923346888696");
  });

  it("shows customers a readable status while the receipt is checked", () => {
    expect(PAYMENT_STATUS_LABEL.UNDER_REVIEW).toBe("Payment under review");
  });

  it("accepts a receipt photo or PDF, and refuses other files", async () => {
    const png = new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], "receipt.png", { type: "image/png" });
    await expect(inspectUpload(png, "PAYMENT_PROOF")).resolves.toMatchObject({ mime: "image/png" });
    const pdf = new File([Buffer.from("%PDF-1.4 test")], "receipt.pdf", { type: "application/pdf" });
    await expect(inspectUpload(pdf, "PAYMENT_PROOF")).resolves.toMatchObject({ mime: "application/pdf" });
    const exe = new File([Buffer.from("MZ not an image")], "receipt.png", { type: "image/png" });
    await expect(inspectUpload(exe, "PAYMENT_PROOF")).rejects.toThrow();
  });
});

describe("Erorex + Audionic accessories", () => {
  it("has all 27 products with photos; only the Erorex car chargers and earbuds still wait for a price", () => {
    expect(BRAND_ACCESSORIES).toHaveLength(27);
    for (const a of BRAND_ACCESSORIES) {
      expect(a.images.length).toBeGreaterThan(0);
      for (const img of a.images) expect(fs.existsSync(path.join(__dirname, "..", "public", img))).toBe(true);
    }
    expect(BRAND_ACCESSORIES.filter((a) => a.brand === "Audionic").every((a) => a.price && a.salePrice && a.salePrice < a.price)).toBe(true);
    const unpriced = BRAND_ACCESSORIES.filter((a) => !a.price).map((a) => a.model);
    expect(unpriced.sort()).toEqual(["AirPro E-6", "C-16", "E-2", "E-3 ANC", "PD-C16"].sort());
    expect(BRAND_ACCESSORIES.find((a) => a.model === "P-06")?.price).toBe(3763);
    expect(BRAND_ACCESSORIES.filter((a) => a.accessoryType === "CHARGER")).toHaveLength(8);
  });
});

describe("Warranty (client request, 10 Oct 2026)", () => {
  it("is 3 days on used phones and 7 days on accessories", () => {
    expect(USED_WARRANTY).toBe("3-day PB Lab warranty");
    expect(ACCESSORY_WARRANTY).toBe("7-day warranty");
  });
});
