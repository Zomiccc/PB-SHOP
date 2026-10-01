import { NextResponse } from "next/server";
import { isPkMobile, normalizePhone } from "@/lib/format";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { db } from "@/lib/db";
import { finalizeOrder, nextOrderNumber } from "@/lib/orders";
import { paymentProvider } from "@/lib/payments";
import { getSetting } from "@/lib/settings";
import { getCurrentCustomer, newPassportNo } from "@/lib/auth";
import { StockError } from "@/lib/inventory";
import { orderToken } from "@/lib/order-token";
import { notify } from "@/lib/notify";
import { SkinOrderError, ownImageFile, resolveSkinLine } from "@/lib/skin-orders";
import { saveAttachment } from "@/lib/attachments";


const Checkout = z
  .object({
    items: z
      .array(
        z.union([
          z.object({ variantId: z.string(), qty: z.number().int().min(1).max(20) }),
          // Custom skin: rebuilt and priced on the server (src/lib/skin-orders.ts).
          z.object({
            qty: z.number().int().min(1).max(20),
            skin: z.object({ typeId: z.string().max(40), modelId: z.string().max(40), designId: z.string().max(40).nullable(), cameraCover: z.boolean(), ownImage: z.string().max(3_000_000).nullish() }),
          }),
        ]),
      )
      .min(1, "Your bag is empty")
      .max(30),
    name: z.string().trim().min(2, "Enter your name").max(80),
    phone: z.string({ message: "Enter your mobile number" }).trim().min(1, "Enter your mobile number").refine(isPkMobile, "Enter a valid Pakistani mobile number, e.g. 0300 1234567"),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
    fulfilment: z.enum(["DELIVERY", "PICKUP"]),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(60).optional(),
    method: z.enum(["MOBILE_WALLET", "DIRECT_DEBIT", "CARD", "COD"]),
    agree: z.literal(true, { message: "Please accept the terms" }),
  })
  .refine((d) => d.fulfilment === "PICKUP" || (d.address && d.address.length >= 8), { path: ["address"], message: "Enter your delivery address" })
  .refine((d) => d.fulfilment === "PICKUP" || (d.city && d.city.length >= 2), { path: ["city"], message: "Enter your city" });

/**
 * Creates a PENDING order from the cart. Prices and stock are always re-read from the database.
 * Online methods hand off to the payment gateway; stock is only committed after server-side
 * payment verification (/api/payments/callback). Cash on delivery commits stock immediately.
 */
export async function POST(req: Request) {
  if (!rateLimit(`orders:${ipFrom(req)}`, 10, 600000).ok) return NextResponse.json({ error: "Too many requests — please try again in a few minutes." }, { status: 429 });
  const parsed = Checkout.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  }
  const d = parsed.data;
  const phone = normalizePhone(d.phone);

  const productItems = d.items.filter((i): i is { variantId: string; qty: number } => "variantId" in i);
  const skinItems = d.items.filter((i) => "skin" in i);
  const variants = await db.variant.findMany({
    where: { id: { in: productItems.map((i) => i.variantId) }, active: true, product: { active: true, type: { notIn: ["PART", "SKIN"] } } },
    include: { product: true },
  });

  const lines: { variantId: string; name: string; sku: string; grade: string | null; unitPrice: number; unitCost: number | null; qty: number }[] = [];
  // Customers' own designs, attached to the order once it exists.
  const ownImages: string[] = [];
  if (skinItems.length) {
    try {
      const resolved = await db.$transaction(async (tx) => Promise.all(skinItems.map(async (i) => ({ i, line: await resolveSkinLine(tx, i.skin) }))));
      for (const { i, line } of resolved) {
        lines.push({ variantId: line.variantId, name: line.name, sku: line.sku, grade: null, unitPrice: line.unitPrice, unitCost: null, qty: i.qty });
        if (line.own && i.skin.ownImage) ownImages.push(i.skin.ownImage);
      }
    } catch (e) {
      if (e instanceof SkinOrderError) return NextResponse.json({ error: e.message }, { status: 409 });
      throw e;
    }
  }
  for (const item of productItems) {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v) return NextResponse.json({ error: "An item in your bag is no longer available. Please review your bag." }, { status: 409 });
    if (v.stockQty < item.qty && !v.allowBackorder) {
      return NextResponse.json({ error: `${v.product.name} (${[v.storage, v.color].filter(Boolean).join(" ")}) has only ${v.stockQty} left.` }, { status: 409 });
    }
    const label = [v.storage, v.color, v.grade ? `Grade ${v.grade}` : null].filter(Boolean).join(" · ");
    lines.push({ variantId: v.id, name: `${v.product.name}${v.product.condition === "USED" ? " (Used)" : ""}${label ? ` — ${label}` : ""}`, sku: v.sku, grade: v.grade, unitPrice: v.salePrice ?? v.price, unitCost: v.costPrice, qty: item.qty });
  }

  const shipping = await getSetting("shipping");
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const shippingFee = d.fulfilment === "PICKUP" || subtotal >= shipping.freeOver ? 0 : shipping.flatFee;
  const total = subtotal + shippingFee;

  const loggedIn = await getCurrentCustomer();
  if (!loggedIn) return NextResponse.json({ error: "Please create an account or log in to check out.", needsAccount: true }, { status: 401 });

  const order = await db.$transaction(async (tx) => {
    // Link to an existing passport by phone, or create a guest profile so loyalty points are never lost.
    const customer =
      loggedIn ??
      (await tx.customer.findUnique({ where: { phone } })) ??
      (await tx.customer.create({ data: { name: d.name, phone, email: d.email || null, passportNo: newPassportNo() } }));

    const o = await tx.order.create({
      data: {
        number: await nextOrderNumber(tx),
        channel: "ONLINE",
        customerId: customer.id,
        customerName: d.name,
        customerPhone: phone,
        customerEmail: d.email || null,
        shippingAddress: d.fulfilment === "DELIVERY" ? d.address : null,
        city: d.fulfilment === "DELIVERY" ? d.city : null,
        fulfilment: d.fulfilment,
        subtotal,
        shippingFee,
        total,
        items: { create: lines },
      },
    });
    await tx.payment.create({
      data: { orderId: o.id, provider: d.method === "COD" ? "CASH" : paymentProvider().name, method: d.method, amount: total },
    });
    return o;
  });

  // The customer's own skin designs, kept privately with the order for the print team (never a catalogue skin).
  for (const [n, dataUrl] of ownImages.entries()) {
    const file = ownImageFile(dataUrl, `${order.number}-own-design-${n + 1}`);
    if (file) await saveAttachment(file, { kind: "PHOTO", orderId: order.id, sensitive: false }).catch(() => null);
  }

  const token = orderToken(order.number);

  if (d.method === "COD") {
    try {
      await finalizeOrder(order.id, { markPaid: false });
    } catch (e) {
      if (e instanceof StockError) {
        await db.order.update({ where: { id: order.id }, data: { paymentStatus: "CANCELLED", fulfilmentStatus: "CANCELLED" } });
        return NextResponse.json({ error: e.message }, { status: 409 });
      }
      throw e;
    }
    await notify({ to: { phone, email: d.email || null }, subject: `Order ${order.number} placed`, text: `PB Mobiles: we've received your cash-on-delivery order ${order.number} (Rs ${total}). We'll call to confirm delivery.` });
    return NextResponse.json({ next: { kind: "redirect", url: `/checkout/result?order=${order.number}&t=${token}` } });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const start = await paymentProvider().start({
    orderNumber: order.number,
    amount: total,
    method: d.method,
    customerPhone: phone,
    customerEmail: d.email,
    description: `PB Mobiles order ${order.number}`,
    returnUrl: `${site}/api/payments/callback`,
  });
  return NextResponse.json({ next: start });
}
