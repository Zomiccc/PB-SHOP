import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { Catalog } from "@/components/product/Catalog";
import { listProducts, toCatalogItems } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accessories",
  description: "Cases, chargers, cables, screen protectors, power banks, earbuds and more — genuine accessories at PB Mobiles.",
};

export default async function AccessoriesPage() {
  const items = toCatalogItems(await listProducts({ type: "ACCESSORY" }));
  return (
    <>
      <PageHero
        eyebrow="Accessories"
        title="Complete"
        accent="the setup."
        intro="Cases, chargers, cables, screen protectors, power banks, earbuds and other essentials. Screen protectors fitted free in store."
      />
        <Catalog items={items} mode="accessories" />
    </>
  );
}
