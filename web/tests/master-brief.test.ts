import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { GradeError, assertVariantGrade, normalizeGrade } from "@/lib/grade";
import { PRODUCT_LIGHTING } from "@/lib/product-lighting";
import { toCatalogItems, type ProductDTO } from "@/lib/catalog";
import { approvedReviews, displayName } from "@/lib/reviews";
import { designFor } from "@/lib/phone-designs";

describe("Strict single-grade rule (§8)", () => {
  it("accepts exactly one valid grade", () => {
    expect(normalizeGrade("a+")).toBe("A+");
    expect(normalizeGrade("Grade B")).toBe("B");
    expect(normalizeGrade("")).toBeNull();
  });

  it("rejects multiple or unknown grades", () => {
    for (const bad of ["A/B", "A, B", "A and B", "A B", "A|B", "Z"]) {
      expect(() => normalizeGrade(bad)).toThrow(GradeError);
    }
  });

  it("requires a grade on used devices and forbids one on new devices", () => {
    expect(() => assertVariantGrade("USED", null)).toThrow(GradeError);
    expect(() => assertVariantGrade("NEW", "A")).toThrow(GradeError);
    expect(assertVariantGrade("USED", "b")).toBe("B");
    expect(assertVariantGrade("NEW", null)).toBeNull();
  });

  it("lists every used SKU as its own card with a single grade", () => {
    const p = {
      id: "p1", slug: "iphone-13-used", name: "iPhone 13", brand: "Apple", type: "PHONE", condition: "USED", accessoryType: null,
      description: "", specs: {}, images: [], finishHex: null, featured: false, careCardEligible: true, model3dUrl: null, model3dTextures: null,
      sketchfabUid: null, metaTitle: null, metaDescription: null, fromPrice: 0, totalStock: 2,
      variants: [
        { id: "v1", sku: "PB-1", storage: "128GB", ram: null, color: "Blue", colorHex: null, price: 100, salePrice: null, stockQty: 1, lowStockThreshold: 0, grade: "A+", batteryHealth: 91, conditionNotes: null, warrantyInfo: null, returnInfo: null },
        { id: "v2", sku: "PB-2", storage: "128GB", ram: null, color: "Blue", colorHex: null, price: 90, salePrice: null, stockQty: 1, lowStockThreshold: 0, grade: "B", batteryHealth: 84, conditionNotes: null, warrantyInfo: null, returnInfo: null },
      ],
    } as ProductDTO;
    const cards = toCatalogItems([p]);
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.grade)).toEqual(["A+", "B"]);
    expect(cards[1].href).toBe("/product/iphone-13-used?v=v2");
  });

  it("snapshots the grade onto order lines (schema)", async () => {
    const fields = Object.keys(db.orderItem.fields ?? {});
    expect(fields).toContain("grade");
  });
});

describe("Strict 3D product colour protection (§6)", () => {
  it("uses only pure-white lights and reflections", () => {
    const colours = [PRODUCT_LIGHTING.ambient.color, PRODUCT_LIGHTING.key.color, PRODUCT_LIGHTING.fill.color, ...PRODUCT_LIGHTING.reflections.map((r) => r.color)];
    expect(colours.every((c) => c.toLowerCase() === "#ffffff")).toBe(true);
  });

  it("disables tone mapping and keeps exposure fixed", () => {
    expect(PRODUCT_LIGHTING.toneMapping).toBe("none");
    expect(PRODUCT_LIGHTING.exposure).toBe(1);
  });
});

describe("Tablets (§9)", () => {
  it("gets tablet-shaped 3D designs", () => {
    expect(designFor("Apple", "iPad Air 11-inch", "TABLET").key).toBe("ipad");
    expect(designFor("Samsung", "Galaxy Tab S9 FE", "TABLET").key).toBe("galaxy-tab");
    expect(designFor("Apple", "iPhone 16", "PHONE").key).toBe("iphone-vertical");
  });
});

describe("Reviews (§3, §17)", () => {
  it("only shows approved reviews, with privacy-safe names", async () => {
    await db.review.createMany({
      data: [
        { customerName: "Ayesha Siddiqui", rating: 5, body: "Great service and quick repair.", status: "APPROVED" },
        { customerName: "Spam Bot", rating: 1, body: "unmoderated review text", status: "PENDING" },
        { customerName: "Rejected Person", rating: 2, body: "rejected review text here", status: "REJECTED" },
      ],
    });
    const list = await approvedReviews({ take: 50 });
    expect(list.some((r) => r.body === "unmoderated review text")).toBe(false);
    expect(list.some((r) => r.body === "rejected review text here")).toBe(false);
    expect(list.find((r) => r.body === "Great service and quick repair.")?.customerName).toBe("Ayesha S.");
    expect(displayName("Ali")).toBe("Ali");
  });
});
