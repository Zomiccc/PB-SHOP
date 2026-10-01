import Link from "next/link";
import { adminSkinBrands } from "@/lib/skins";
import { PageTitle, Panel } from "@/components/admin/Primitives";
import { SkinForm } from "@/components/admin/SkinForm";

export const metadata = { title: "Create skin" };

export default async function NewSkinPage() {
  const brands = await adminSkinBrands();
  return (
    <>
      <PageTitle title="Create skin" sub="Upload the artwork, set the price and choose the brands / models it's available for.">
        <Link href="/admin/skins" className="text-sm text-blue">← Custom skins</Link>
      </PageTitle>
      <Panel>
        <SkinForm brands={brands} />
      </Panel>
    </>
  );
}
