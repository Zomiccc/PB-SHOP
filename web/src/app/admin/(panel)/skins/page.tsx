import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { toTemplate } from "@/lib/skins";
import { DESIGN_MODES, SKIN_LOOKS } from "@/lib/skin-template";
import { Badge, PageTitle, Panel, Table, Td } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { SkinPreview } from "@/components/skins/SkinPreview";
import { BulkSkinUpload } from "@/components/admin/BulkSkinUpload";
import { deleteSkinTypeAction, saveSkinTypeAction, toggleSkinAction } from "../../_actions/skins";

export const metadata = { title: "Custom skins" };

/**
 * Custom Skins admin (v4 §10 + client requests): skin types and prices, adding many designs at once,
 * and the designs list. Designs marked "all models" automatically appear on every phone model,
 * including models added later.
 */
export default async function SkinsAdminPage(props: PageProps<"/admin/skins">) {
  const sp = await props.searchParams;
  const [types, skins, sampleModel, brands, modelCount] = await Promise.all([
    db.skinType.findMany({ orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    db.skin.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }], include: { models: { include: { brand: true }, orderBy: { name: "asc" } } } }),
    db.phoneModel.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.skinBrand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.phoneModel.count(),
  ]);

  return (
    <>
      <PageTitle title="Custom skins" sub={`${types.length} skin types · ${skins.length} designs · ${brands.length} brands · ${modelCount} phone models`}>
        <Link href="/admin/skins/models" className="btn btn-ghost !py-2.5 !text-sm text-ink"><span>Brands & phone models</span></Link>
        <Link href="/admin/skins/new" className="btn btn-red !py-2.5 !text-sm">Add one design</Link>
        <Link href="/custom-skins" target="_blank" className="text-sm text-blue">View page →</Link>
      </PageTitle>
      {sp.deleted && <p className="mb-4 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Design deleted.</p>}

      <Panel title="Skin types & prices" className="mb-6">
        <p className="mb-4 text-sm text-muted">What the customer chooses first — it sets the price. Add a new type any time (e.g. a new material).</p>
        <div className="space-y-2">
          {types.map((t) => <TypeRow key={t.id} t={t} />)}
          <details className="rounded-xl border-2 border-dashed border-ink/15 p-3">
            <summary className="cursor-pointer text-sm font-semibold">+ Add a skin type</summary>
            <div className="mt-3"><TypeRow /></div>
          </details>
        </div>
      </Panel>

      <Panel title="Add many designs at once" className="mb-6">
        <BulkSkinUpload brands={brands} />
      </Panel>

      <Panel title="Designs">
        <Table head={["Design", "Extra", "Available for", "Status", ""]} empty="No designs yet — upload some above.">
          {skins.map((s) => {
            const brandNames = [...new Set(s.models.map((m) => m.brand.name))];
            const tpl = s.models[0] ?? sampleModel;
            return (
              <tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-9 shrink-0">{tpl ? <SkinPreview template={toTemplate(tpl)} imageUrl={s.imageUrl} focus={s.focus} className="h-full w-full" /> : <div className="h-full w-full rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${s.imageUrl})` }} />}</div>
                    <Link href={`/admin/skins/${s.id}`} className="font-semibold hover:text-blue">{s.name}</Link>
                  </div>
                </Td>
                <Td>{s.price ? `+${pkr(s.price)}` : <span className="text-muted">—</span>}</Td>
                <Td className="max-w-xs text-xs">
                  {s.allModels ? <b>All phone models</b> : s.models.length ? <><b>{brandNames.join(", ")}</b><span className="block truncate text-muted">{s.models.length} model{s.models.length > 1 ? "s" : ""}: {s.models.map((m) => m.name).join(", ")}</span></> : <span className="text-red">Not available on any model</span>}
                </Td>
                <Td>{s.active ? <Badge tone="green">Enabled</Badge> : <Badge>Disabled</Badge>}</Td>
                <Td className="whitespace-nowrap">
                  <ActionForm action={toggleSkinAction} className="inline-flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <Submit variant="ghost">{s.active ? "Disable" : "Enable"}</Submit>
                    <Link href={`/admin/skins/${s.id}`} className="btn btn-ghost !py-2.5 !text-sm text-ink"><span>Edit</span></Link>
                  </ActionForm>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}

function TypeRow({ t }: { t?: { id: string; name: string; description: string | null; price: number; look: string; designMode: string; active: boolean; sortOrder: number } }) {
  return (
    <div className="rounded-xl bg-cream/40 p-3 ring-1 ring-white/5">
      <ActionForm action={saveSkinTypeAction} resetOnSuccess={!t} className="space-y-2">
        {t && <input type="hidden" name="id" value={t.id} />}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_80px_auto] sm:items-center">
          <input name="name" required defaultValue={t?.name} placeholder="e.g. Leather Skin" aria-label="Skin type name" className="field font-semibold" />
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">Rs</span>
            <input name="price" type="number" min={0} required defaultValue={t?.price} aria-label="Price (Rs)" className="field !pl-9" />
          </label>
          <input name="sortOrder" type="number" defaultValue={t?.sortOrder ?? 0} aria-label="Order" title="Order on the page" className="field" />
          <span className="flex items-center gap-3">
            {t && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="active" defaultChecked={t.active} className="h-4 w-4" /> On</label>}
            <Submit variant={t ? "ghost" : "gold"}>{t ? "Save" : "Add type"}</Submit>
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.3fr)]">
          <select name="look" defaultValue={t?.look ?? "MATTE"} aria-label="Preview look" title="How it looks in the preview" className="field !py-2 !text-sm">
            {Object.entries(SKIN_LOOKS).map(([k, v]) => <option key={k} value={k}>Look: {v}</option>)}
          </select>
          <select name="designMode" defaultValue={t?.designMode ?? "DESIGN"} aria-label="Customer chooses" className="field !py-2 !text-sm">
            {Object.entries(DESIGN_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input name="description" defaultValue={t?.description ?? ""} placeholder="Short description for customers (optional)" aria-label="Description" className="field !py-2 !text-sm" />
        </div>
      </ActionForm>
      {t && (
        <ActionForm action={deleteSkinTypeAction} confirm={`Delete the "${t.name}" skin type?`} className="mt-2 text-right">
          <input type="hidden" name="id" value={t.id} />
          <button className="text-xs text-red hover:underline">Delete type</button>
        </ActionForm>
      )}
    </div>
  );
}
