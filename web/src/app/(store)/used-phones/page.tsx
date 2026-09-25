import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { Catalog } from "@/components/product/Catalog";
import { listProducts, toCatalogItems } from "@/lib/catalog";
import { USED_GRADES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Used Phones",
  description: "Quality-checked used phones graded A+ to C with battery health, condition notes, warranty and return information.",
};

export default async function UsedPhonesPage() {
  const items = toCatalogItems(await listProducts({ type: "PHONE", condition: "USED" }));
  return (
    <>
      <PageHero
        eyebrow="Used phones"
        title="Pre-loved."
        accent="Lab-checked."
        intro="Every used device is tested by the PB Repairing Lab, honestly graded, and listed with battery health, notes, warranty and return information."
      >
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(USED_GRADES).map(([g, d]) => (
            <div key={g} className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
              <p className="display text-2xl text-navy-950">Grade {g}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </PageHero>
      <Suspense>
        <Catalog items={items} mode="used" />
      </Suspense>
    </>
  );
}
