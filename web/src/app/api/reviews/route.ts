import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ipFrom, rateLimit } from "@/lib/rate-limit";
import { isVerifiedCustomer } from "@/lib/reviews";

const Review = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone: z.union([z.literal(""), z.string().trim().regex(/^(\+92|0)?3\d{2}[\s-]?\d{7}$/, "Enter a valid mobile number")]).optional(),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(1500),
  website: z.string().max(0).optional(), // honeypot
});

/** Public review submission — always PENDING until staff approve it in Admin → Reviews. */
export async function POST(req: Request) {
  if (!rateLimit(`review:${ipFrom(req)}`, 5, 60 * 60_000).ok) return NextResponse.json({ error: "Too many reviews from this connection — please try later." }, { status: 429 });
  const parsed = Review.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the highlighted fields", fields: z.flattenError(parsed.error).fieldErrors }, { status: 422 });
  const d = parsed.data;
  if (d.productId && !(await db.product.findFirst({ where: { id: d.productId, active: true } }))) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const phone = d.phone ? d.phone.replace(/[\s-]/g, "") : null;
  await db.review.create({
    data: {
      productId: d.productId || null,
      customerName: d.name,
      phone,
      rating: d.rating,
      title: d.title || null,
      body: d.body,
      verified: await isVerifiedCustomer(phone),
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
