import { db } from "@/lib/db";
import { getStaff } from "@/lib/staff";
import { audit } from "@/lib/audit";

const csv = (rows: (string | number | null | undefined)[][]) =>
  rows.map((r) => r.map((c) => {
    const s = c == null ? "" : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");

/** CSV exports for accounting / offline backup (§10 backup strategy, §5 reports). */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return new Response("Not signed in", { status: 401 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  let body = "";
  if (type === "orders") {
    const days = Math.min(365, Number(url.searchParams.get("days")) || 30);
    const orders = await db.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - days * 86400_000) } }, include: { payments: true, staff: true, items: true }, orderBy: { createdAt: "asc" } });
    body = csv([
      ["Order", "Date", "Channel", "Customer", "Phone", "Items", "Subtotal", "Discount", "Delivery", "Total", "Payment status", "Method", "Txn ref", "Fulfilment", "Staff"],
      ...orders.map((o) => [o.number, o.createdAt.toISOString(), o.channel, o.customerName, o.customerPhone, o.items.map((i) => `${i.qty}x ${i.sku}`).join(" | "), o.subtotal, o.discount, o.shippingFee, o.total, o.paymentStatus, o.payments[0]?.method, o.payments[0]?.providerRef, o.fulfilmentStatus, o.staff?.name]),
    ]);
  } else if (type === "inventory") {
    const variants = await db.variant.findMany({ include: { product: true }, orderBy: { sku: "asc" } });
    body = csv([
      ["SKU", "Barcode", "Product", "Brand", "Condition", "Storage", "Colour", "Grade", "Battery %", "Price", "Sale price", "Stock", "Low-stock at", "Active"],
      ...variants.map((v) => [v.sku, v.barcode, v.product.name, v.product.brand, v.product.condition, v.storage, v.color, v.grade, v.batteryHealth, v.price, v.salePrice, v.stockQty, v.lowStockThreshold, v.active && v.product.active ? "yes" : "no"]),
    ]);
  } else if (type === "audit" && staff.role === "SUPER_ADMIN") {
    const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20000, include: { staff: true } });
    body = csv([["Time", "User", "Action", "Record", "Before", "After", "IP"], ...logs.map((l) => [l.createdAt.toISOString(), l.staff?.name ?? "system", l.action, l.recordLabel, l.before, l.after, l.ip])]);
  } else {
    return new Response("Unknown export", { status: 400 });
  }
  await audit({ staffId: staff.id, action: "DATA_EXPORTED", entityType: "SETTING", entityId: type, recordLabel: `CSV export: ${type}` });
  return new Response("﻿" + body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pb-${type}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
