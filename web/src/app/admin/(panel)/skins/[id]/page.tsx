import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { adminSkinBrands } from "@/lib/skins";
import { PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { SkinForm } from "@/components/admin/SkinForm";
import { deleteSkinAction, duplicateSkinAction } from "../../../_actions/skins";

export const metadata = { title: "Edit skin" };

export default async function EditSkinPage(props: PageProps<"/admin/skins/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [skin, brands] = await Promise.all([db.skin.findUnique({ where: { id }, include: { models: { select: { id: true } } } }), adminSkinBrands()]);
  if (!skin) notFound();
  return (
    <>
      <PageTitle title={skin.name} sub="Edit the design, price and where it's available.">
        <ActionForm action={duplicateSkinAction}>
          <input type="hidden" name="id" value={skin.id} />
          <Submit variant="ghost">Duplicate</Submit>
        </ActionForm>
        <Link href="/admin/skins" className="text-sm text-blue">← Custom skins</Link>
      </PageTitle>
      {sp.created && <p className="mb-4 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Design created.</p>}
      {sp.copied && <p className="mb-4 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Copy created (disabled) — rename it, change what you need, tick Enabled and save.</p>}
      <Panel>
        <SkinForm brands={brands} skin={{ id: skin.id, name: skin.name, description: skin.description, imageUrl: skin.imageUrl, fullImageUrl: skin.fullImageUrl, focus: skin.focus, price: skin.price, allModels: skin.allModels, active: skin.active, sortOrder: skin.sortOrder, modelIds: skin.models.map((m) => m.id) }} />
      </Panel>
      <Panel title="Delete design" className="mt-6 ring-1 ring-red/30">
        <p className="text-sm text-muted">Removes this design from every model. To hide it for now, disable it instead.</p>
        <ActionForm action={deleteSkinAction} confirm={`Delete the "${skin.name}" skin?`} className="mt-3">
          <input type="hidden" name="id" value={skin.id} />
          <Submit variant="red">Delete design</Submit>
        </ActionForm>
      </Panel>
    </>
  );
}
