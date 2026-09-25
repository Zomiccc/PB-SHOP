import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { Catalog } from "@/components/product/Catalog";
import { listProducts, toCatalogItems } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Phones",
  description: "Shop brand-new iPhone, Samsung, Google, Xiaomi and more at PB Mobiles. Filter by brand, storage, colour, price and stock.",
};

export default async function NewPhonesPage() {
  const items = toCatalogItems(await listProducts({ type: "PHONE", condition: "NEW" }));
  return (
    <>
      <PageHero
        eyebrow="New phones"
        title="The latest,"
        accent="in stock."
        intro="Brand-new devices with official warranty where applicable. Rotate any phone in 3D, compare storage and colours, and pay securely online."
      />
        <Catalog items={items} mode="new" />
    </>
  );
}
