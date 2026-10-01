import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { toTemplate } from "@/lib/skins";
import { PageTitle, Panel } from "@/components/admin/Primitives";
import { PhoneModelForm } from "@/components/admin/PhoneModelForm";

export const metadata = { title: "Add phone model" };

/**
 * Add a phone model (client request: staff add new phones themselves). Start from a similar model's
 * template (or ?from=<id> to duplicate one), adjust, save — every "all models" design appears on it at once.
 */
export default async function NewPhoneModelPage(props: PageProps<"/admin/skins/models/new">) {
  const sp = await props.searchParams;
  const [brands, models, sample] = await Promise.all([
    db.skinBrand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.phoneModel.findMany({ orderBy: [{ brand: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }], include: { brand: { select: { name: true } } } }),
    db.skin.findFirst({ where: { active: true }, select: { imageUrl: true } }),
  ]);
  if (!brands.length) redirect("/admin/skins/models");
  const from = typeof sp.from === "string" ? models.find((m) => m.id === sp.from) : undefined;
  const brandId = from?.brandId ?? (typeof sp.brand === "string" && brands.some((b) => b.id === sp.brand) ? sp.brand : brands[0].id);
  return (
    <>
      <PageTitle title={from ? `New model from ${from.brand.name} ${from.name}` : "Add phone model"} sub="Name the model and set its skin template. Designs set to “all phone models” appear on it automatically.">
        <Link href="/admin/skins/models" className="text-sm text-blue">← Brands & models</Link>
      </PageTitle>
      <Panel>
        <PhoneModelForm
          key={from?.id ?? brandId}
          brands={brands}
          sampleImage={sample?.imageUrl}
          defaultBrandId={brandId}
          initial={from ? toTemplate(from) : undefined}
          copyFrom={models.map((m) => ({ id: m.id, label: `${m.brand.name} ${m.name}`, template: toTemplate(m) }))}
        />
      </Panel>
    </>
  );
}
