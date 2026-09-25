import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/Primitives";
import { Labels } from "@/components/admin/Labels";

export const metadata = { title: "Barcode labels" };

export default async function LabelsPage(props: PageProps<"/admin/labels">) {
  const { product } = await props.searchParams;
  const variants = await db.variant.findMany({
    where: { active: true, product: { active: true, ...(typeof product === "string" ? { id: product } : {}) } },
    include: { product: true },
    orderBy: { sku: "asc" },
  });
  return (
    <>
      <PageTitle title="Barcode labels" sub="Every SKU has a unique barcode. Print, stick on the box, then scan at the POS." />
      <Labels
        items={variants.map((v) => ({
          id: v.id,
          name: v.product.name,
          detail: [v.storage, v.color, v.grade && `Gr ${v.grade}`].filter(Boolean).join(" "),
          sku: v.sku,
          barcode: v.barcode,
          price: v.salePrice ?? v.price,
          stock: v.stockQty,
        }))}
      />
    </>
  );
}
