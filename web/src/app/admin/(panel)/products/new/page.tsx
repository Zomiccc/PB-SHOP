import Link from "next/link";
import { PageTitle, Panel } from "@/components/admin/Primitives";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <>
      <PageTitle title="Add product" sub="Create the product first, then add variants (SKU, barcode, price, stock), photos and the 3D model.">
        <Link href="/admin/products" className="text-sm text-blue">← Products</Link>
      </PageTitle>
      <Panel className="max-w-3xl"><ProductForm /></Panel>
    </>
  );
}
