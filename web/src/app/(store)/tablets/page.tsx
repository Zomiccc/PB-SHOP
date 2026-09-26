import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { Catalog } from "@/components/product/Catalog";
import { listProducts, toCatalogItems } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tablets",
  description: "Shop new and lab-checked tablets — iPad, Samsung Galaxy Tab, Xiaomi Pad and more. Filter by brand, storage, RAM, condition, price and stock.",
};

export default async function TabletsPage() {
  const items = toCatalogItems(await listProducts({ type: "TABLET" }));
  return (
    <>
      <PageHero
        eyebrow="Tablets"
        title="Bigger screen,"
        accent="same care."
        intro="New and lab-checked used tablets for study, work and play. Every used tablet is individually graded, with battery health and warranty listed."
      />
      <Catalog items={items} mode="tablets" />
    </>
  );
}
