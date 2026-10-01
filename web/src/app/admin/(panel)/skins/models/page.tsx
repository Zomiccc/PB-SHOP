import Link from "next/link";
import { db } from "@/lib/db";
import { toTemplate } from "@/lib/skins";
import { Badge, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { SkinPreview } from "@/components/skins/SkinPreview";
import { saveSkinBrandAction } from "../../../_actions/skins";

export const metadata = { title: "Skin brands & models" };

/** Custom Skins (v4 §10 "Manage Models"): phone brands, their models and each model's preview template. */
export default async function SkinModelsPage(props: PageProps<"/admin/skins/models">) {
  const sp = await props.searchParams;
  const brands = await db.skinBrand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { models: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { skins: true } } } } },
  });
  return (
    <>
      <PageTitle title="Brands & models" sub="The brands customers search, the models in each brand's dropdown, and each model's skin template.">
        {brands.length > 0 && <Link href="/admin/skins/models/new" className="btn btn-red !py-2.5 !text-sm">Add model</Link>}
        <Link href="/admin/skins" className="text-sm text-blue">← Custom skins</Link>
      </PageTitle>
      {sp.deleted && <p className="mb-4 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Model deleted.</p>}

      <Panel title="Add a brand" className="mb-6">
        <ActionForm action={saveSkinBrandAction} resetOnSuccess className="flex flex-wrap gap-2">
          <input name="name" required placeholder="e.g. Xiaomi" className="field !w-60" />
          <Submit>Add brand</Submit>
        </ActionForm>
      </Panel>

      <div className="space-y-6">
        {brands.map((b) => (
          <Panel key={b.id}>
            <ActionForm action={saveSkinBrandAction} className="mb-4 flex flex-wrap items-center gap-2 border-b border-ink/10 pb-4">
              <input type="hidden" name="id" value={b.id} />
              <input name="name" defaultValue={b.name} aria-label="Brand name" className="field !w-48 font-semibold" />
              <input name="sortOrder" type="number" defaultValue={b.sortOrder} aria-label="Order" className="field !w-20" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b.active} className="h-4 w-4" /> Active</label>
              <Submit variant="ghost">Save</Submit>
              <Link href={`/admin/skins/models/new?brand=${b.id}`} className="ml-auto text-sm text-blue">+ Add {b.name} model</Link>
            </ActionForm>
            {b.models.length === 0 ? (
              <p className="text-sm text-muted">No models yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {b.models.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/skins/models/${m.id}`} className="block rounded-xl bg-navy-950 p-3 text-white ring-1 ring-white/10 hover:ring-gold/60">
                      <SkinPreview template={toTemplate(m)} className="mx-auto h-32 w-full" label={m.name} />
                      <p className="mt-2 truncate text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-white/50">{m.widthMm}×{m.heightMm} mm · {m._count.skins} assigned design{m._count.skins === 1 ? "" : "s"}</p>
                      {!m.active && <Badge>Hidden</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
