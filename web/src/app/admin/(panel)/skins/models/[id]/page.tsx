import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { PhoneModelForm } from "@/components/admin/PhoneModelForm";
import { deletePhoneModelAction } from "../../../../_actions/skins";

export const metadata = { title: "Phone model" };

export default async function PhoneModelPage(props: PageProps<"/admin/skins/models/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [model, brands] = await Promise.all([
    db.phoneModel.findUnique({ where: { id }, include: { brand: true, skins: { where: { active: true }, take: 1, select: { imageUrl: true } } } }),
    db.skinBrand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  if (!model) notFound();
  const sample = model.skins[0]?.imageUrl ?? (await db.skin.findFirst({ where: { active: true }, select: { imageUrl: true } }))?.imageUrl;
  return (
    <>
      <PageTitle title={`${model.brand.name} ${model.name}`} sub="Skin template — every skin assigned to this model is fitted to this shape.">
        <Link href={`/admin/skins/models/new?from=${model.id}`} className="btn btn-ghost !py-2.5 !text-sm text-ink"><span>Duplicate as new model</span></Link>
        <Link href={`/custom-skins/${model.brand.slug}/${model.slug}`} target="_blank" className="text-sm text-blue">Customer page →</Link>
        <Link href="/admin/skins/models" className="text-sm text-blue">← Brands & models</Link>
      </PageTitle>
      {sp.created && <p className="mb-4 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Model added — designs set to “all phone models” already show on it. Assign any others from Custom skins.</p>}
      <Panel>
        <PhoneModelForm brands={brands} model={model} sampleImage={sample} />
      </Panel>
      <Panel title="Delete model" className="mt-6 ring-1 ring-red/30">
        <p className="text-sm text-muted">Removes this model from the Custom Skins page and unassigns its skins (the skins themselves are kept). To hide it for now, untick Active instead.</p>
        <ActionForm action={deletePhoneModelAction} confirm={`Delete ${model.brand.name} ${model.name}?`} className="mt-3">
          <input type="hidden" name="id" value={model.id} />
          <Submit variant="red">Delete model</Submit>
        </ActionForm>
      </Panel>
    </>
  );
}
