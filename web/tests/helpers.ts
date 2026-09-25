import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function makeStaff(role: "ADMIN" | "SUPER_ADMIN" = "ADMIN", password = "Secret123!") {
  const id = uid();
  return db.staff.create({ data: { name: `Staff ${id}`, email: `s${id}@test.pk`, role, passwordHash: await bcrypt.hash(password, 4), mustChangePassword: false } });
}

export async function makeCustomer() {
  const id = uid();
  return db.customer.create({ data: { name: `Ali Khan ${id}`, phone: `0300${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`, passportNo: `PBP-T${id}` } });
}

export async function makeVariant(opts: { stock?: number; price?: number; phone?: boolean; careCard?: boolean } = {}) {
  const id = uid();
  const product = await db.product.create({
    data: {
      slug: `p-${id}`,
      name: `Test Phone ${id}`,
      brand: "Test",
      type: opts.phone === false ? "ACCESSORY" : "PHONE",
      description: "test",
      careCardEligible: opts.careCard ?? true,
    },
  });
  return db.variant.create({ data: { productId: product.id, sku: `T-${id}`, barcode: `99${id}`, price: opts.price ?? 100000, stockQty: opts.stock ?? 5 } });
}

export async function makeOrder(variantId: string, qty: number, customerId?: string, total?: number) {
  const v = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
  const id = uid();
  return db.order.create({
    data: {
      number: `TEST-${id}`,
      channel: "ONLINE",
      customerId,
      customerName: "Ali Khan",
      customerPhone: "03001234567",
      city: "Lahore",
      subtotal: v.price * qty,
      total: total ?? v.price * qty,
      items: { create: [{ variantId, name: "Test", sku: v.sku, unitPrice: v.price, qty }] },
      payments: { create: [{ provider: "SANDBOX", amount: total ?? v.price * qty }] },
    },
  });
}

export async function setCareServices() {
  await db.careCardRedemption.deleteMany();
  await db.careCardService.deleteMany();
  const names = ["Battery check", "Screen protector", "Charging port check", "Storage check"];
  for (let i = 0; i < 4; i++) await db.careCardService.create({ data: { visitNumber: i + 1, name: names[i] } });
  await db.careCardService.create({ data: { visitNumber: 5, name: "Reserved", configured: false, active: false } });
  return db.careCardService.findMany({ orderBy: { visitNumber: "asc" } });
}
