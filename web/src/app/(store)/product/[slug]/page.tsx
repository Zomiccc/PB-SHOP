import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductCard } from "@/components/product/ProductCard";
import { getProductBySlug, getRelated, toCatalogItems } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { approvedReviews, reviewStats } from "@/lib/reviews";
import { ReviewCard, ReviewForm, Stars } from "@/components/reviews/Reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  return {
    title: { absolute: p.metaTitle ?? `${p.name} | PB Mobiles` },
    description: p.metaDescription ?? p.description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description: p.description, images: p.images[0] ? [p.images[0]] : ["/brand/og.jpg"] },
  };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const { v } = await props.searchParams;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, loyalty, financing, reviews, stats] = await Promise.all([getRelated(product), getSetting("loyalty"), getSetting("financing"), approvedReviews({ productId: product.id, take: 12 }), reviewStats(product.id)]);

  // Structured data for search engines (§10 SEO-friendly structure).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description,
    sku: product.variants[0]?.sku,
    itemCondition: product.condition === "USED" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    ...(stats.count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: stats.average, reviewCount: stats.count } } : {}),
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      priceCurrency: "PKR",
      price: v.salePrice ?? v.price,
      availability: v.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} />
      <ProductDetail product={product} pointsPerRupees={loyalty.pointsPerRupees} financing={financing} initialVariantId={typeof v === "string" ? v : undefined} />
      <section id="reviews" className="border-t border-white/5 py-16">
        <div className="container-pb grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow text-gold">Reviews</p>
            <h2 className="display mt-4 text-4xl">What customers say</h2>
            {stats.count > 0 ? (
              <p className="mt-3 flex items-center gap-3 text-sm"><Stars value={stats.average ?? 0} className="h-5 w-5" /> <b>{stats.average}</b> <span className="text-muted">from {stats.count} review{stats.count > 1 ? "s" : ""}</span></p>
            ) : (
              <p className="mt-3 text-sm text-muted">No reviews yet — be the first to share your experience.</p>
            )}
            <div className="mt-6"><ReviewForm productId={product.id} productName={product.name} /></div>
          </div>
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {reviews.map((r) => <ReviewCard key={r.id} r={{ ...r, createdAt: r.createdAt.toISOString(), productName: null }} />)}
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="bg-navy-950 py-20 text-white">
          <div className="container-pb">
            <p className="eyebrow text-gold">You might also like</p>
            <h2 className="display mt-4 text-4xl md:text-5xl">Related picks</h2>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {toCatalogItems(related).map((item) => (
                <ProductCard key={item.id} item={item} dark />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
