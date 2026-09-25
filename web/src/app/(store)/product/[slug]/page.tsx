import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductCard } from "@/components/product/ProductCard";
import { getProductBySlug, getRelated, toCatalogItems } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";

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
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, loyalty] = await Promise.all([getRelated(product), getSetting("loyalty")]);

  // Structured data for search engines (§10 SEO-friendly structure).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description,
    sku: product.variants[0]?.sku,
    itemCondition: product.condition === "USED" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
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
      <ProductDetail product={product} pointsPerRupees={loyalty.pointsPerRupees} />
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
