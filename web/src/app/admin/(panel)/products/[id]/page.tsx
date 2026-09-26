import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr, parseJson } from "@/lib/format";
import { suggestCodes } from "@/lib/barcode";
import { requireStaffPage } from "@/lib/staff";
import { USED_GRADES } from "@/lib/constants";
import { Badge, Field, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { SixPhotoForm } from "@/components/admin/SixPhotoForm";
import { ModelPreview } from "@/components/admin/ModelPreview";
import { adjustStockAction, clearModelAction, removeImageAction, saveVariantAction, toggleProductActiveAction, uploadImagesAction, uploadModelAction } from "../../../_actions/products";
import { approveModelJobAction, refreshModelJobAction, regenerateModelJobAction } from "../../../_actions/model3d";
import type { Variant } from "@prisma/client";

export const metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  const staff = await requireStaffPage();
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { createdAt: "asc" }, include: { movements: { orderBy: { createdAt: "desc" }, take: 6, include: { staff: true } } } },
      modelJobs: { orderBy: { createdAt: "desc" }, take: 6, include: { createdBy: true } },
    },
  });
  if (!product) notFound();
  const images = parseJson<string[]>(product.images, []);
  const codes = await suggestCodes();
  const textures = parseJson<Record<string, string> | null>(product.model3dTextures, null);

  return (
    <>
      <PageTitle title={product.name} sub={`${product.brand} · ${product.type === "ACCESSORY" ? "Accessory" : `${product.condition === "USED" ? "Used" : "New"} ${product.type === "TABLET" ? "tablet" : "phone"}`}`}>
        <Link href={`/product/${product.slug}`} target="_blank" className="btn btn-ghost !py-2.5 !text-sm text-ink"><span>View in shop</span></Link>
        <Link href={`/admin/labels?product=${product.id}`} className="btn btn-ghost !py-2.5 !text-sm text-ink"><span>Print labels</span></Link>
        <ActionForm action={toggleProductActiveAction} confirm={product.active ? "Hide this product from the shop?" : undefined}>
          <input type="hidden" name="id" value={product.id} />
          <Submit variant={product.active ? "ghost" : "gold"}>{product.active ? "Deactivate" : "Activate"}</Submit>
        </ActionForm>
      </PageTitle>
      {created && <p className="mb-6 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Product created. Now add at least one variant with its SKU, barcode, price and stock.</p>}
      {!product.active && <p className="mb-6 rounded-xl bg-gold/15 px-4 py-3 text-sm text-gold-soft">This product is hidden from customers.</p>}

      <div className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <Panel title="Details"><ProductForm product={product} /></Panel>

        <div className="space-y-6">
          <Panel title={`Variants & stock (${product.variants.length})`}>
            <div className="space-y-3">
              {product.variants.map((v) => (
                <details key={v.id} className="rounded-xl border border-ink/10 open:bg-cream/50">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="font-mono font-semibold">{v.sku}</span>
                    <span>{[v.storage, v.color, v.grade && `Grade ${v.grade}`].filter(Boolean).join(" · ") || "Standard"}</span>
                    <span className="ml-auto font-semibold">{pkr(v.salePrice ?? v.price)}</span>
                    <Badge tone={v.stockQty <= 0 ? "red" : v.stockQty <= v.lowStockThreshold ? "gold" : "green"}>{v.stockQty} in stock</Badge>
                    {!v.active && <Badge>inactive</Badge>}
                  </summary>
                  <div className="space-y-5 border-t border-ink/10 p-4">
                    <VariantForm productId={product.id} v={v} isSuper={staff.role === "SUPER_ADMIN"} used={product.condition === "USED"} />
                    <ActionForm action={adjustStockAction} resetOnSuccess className="rounded-xl bg-card p-4">
                      <p className="mb-3 text-sm font-semibold">Adjust stock</p>
                      <input type="hidden" name="variantId" value={v.id} />
                      <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
                        <input name="qty" type="number" placeholder="+5 / -1" required className="field" />
                        <input name="reason" placeholder="Reason (delivery received, damaged, count correction…)" required className="field" />
                        <Submit>Apply</Submit>
                      </div>
                    </ActionForm>
                    {v.movements.length > 0 && (
                      <div>
                        <p className="label">Recent stock movements</p>
                        <ul className="space-y-1 text-xs">
                          {v.movements.map((m) => (
                            <li key={m.id} className="flex gap-3">
                              <span className="w-32 text-muted">{dt(m.createdAt)}</span>
                              <Badge tone={m.qtyChange > 0 ? "green" : "red"}>{m.type} {m.qtyChange > 0 ? "+" : ""}{m.qtyChange}</Badge>
                              <span>→ {m.qtyAfter}</span>
                              <span className="truncate text-muted">{m.reason} · {m.staff?.name ?? "Online"}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              ))}
              <details className="rounded-xl border-2 border-dashed border-ink/15" open={product.variants.length === 0}>
                <summary className="cursor-pointer p-3 text-sm font-semibold text-blue">+ Add variant</summary>
                <div className="border-t border-ink/10 p-4">
                  <VariantForm productId={product.id} suggested={codes} isSuper={staff.role === "SUPER_ADMIN"} used={product.condition === "USED"} />
                </div>
              </details>
            </div>
          </Panel>

          <Panel title="Photos">
            {images.length > 0 && (
              <div className="mb-4 grid grid-cols-4 gap-3">
                {images.map((src) => (
                  <div key={src} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-square w-full rounded-xl bg-cream object-contain" />
                    <ActionForm action={removeImageAction} confirm="Remove this image?" className="absolute right-1 top-1">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="url" value={src} />
                      <button className="rounded-full bg-red px-2 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100">✕</button>
                    </ActionForm>
                  </div>
                ))}
              </div>
            )}
            <ActionForm action={uploadImagesAction} resetOnSuccess className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple className="text-sm" />
              <Submit>Upload</Submit>
            </ActionForm>
            <p className="mt-2 text-xs text-muted">First image is the main photo. JPG/PNG/WebP up to 8MB.</p>
          </Panel>
        </div>
      </div>

      {(product.type === "PHONE" || product.type === "TABLET") && (
        <Panel title="3D model (§4, §14)" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="mb-3 text-sm">
                Currently shown to customers:{" "}
                <b>{product.model3dKind === "GLB" ? "uploaded / generated GLB model" : product.model3dKind === "TEXTURED" ? "6-photo textured model" : "default PB 3D preview (tinted with finish colour)"}</b>
              </p>
              <ModelPreview kind={product.model3dKind} url={product.model3dUrl} textures={textures} color={product.finishHex ?? "#1c3552"} name={product.name} brand={product.brand} />
              {product.model3dKind && (
                <ActionForm action={clearModelAction} confirm="Remove the 3D model and fall back to the default preview?" className="mt-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <Submit variant="ghost">Remove model</Submit>
                </ActionForm>
              )}
              <ActionForm action={uploadModelAction} className="mt-5 rounded-xl bg-cream p-4">
                <p className="mb-2 text-sm font-semibold">Upload an approved .glb file</p>
                <input type="hidden" name="productId" value={product.id} />
                <div className="flex flex-wrap items-center gap-3">
                  <input type="file" name="model" accept=".glb,model/gltf-binary" className="text-sm" />
                  <Submit>Attach</Submit>
                </div>
              </ActionForm>
            </div>
            <div>
              <SixPhotoForm productId={product.id} />
              <div className="mt-6">
                <p className="label">Generation jobs</p>
                {product.modelJobs.length === 0 ? (
                  <p className="text-sm text-muted">No jobs yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {product.modelJobs.map((j) => (
                      <li key={j.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={statusTone(j.status)}>{j.status.replace("_", " ")}</Badge>
                          <span className="font-medium">{j.pipeline === "AI" ? `AI reconstruction (${j.provider})` : "Textured parametric"}</span>
                          <span className="ml-auto text-xs text-muted">{dt(j.createdAt)} · {j.createdBy.name}</span>
                        </div>
                        {j.error && <p className="mt-2 text-xs text-red">{j.error}</p>}
                        <div className="mt-2 flex gap-1.5">
                          {[j.photoFront, j.photoBack, j.photoLeft, j.photoRight, j.photoTop, j.photoBottom].map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="" className="h-10 w-10 rounded bg-cream object-contain" />
                          ))}
                        </div>
                        {["READY", "NEEDS_REVIEW"].includes(j.status) && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-blue">Preview before publishing</summary>
                            <div className="mt-3">
                              <ModelPreview
                                kind={j.pipeline === "AI" ? "GLB" : "TEXTURED"}
                                url={j.resultUrl}
                                textures={{ front: j.photoFront, back: j.photoBack, left: j.photoLeft, right: j.photoRight, top: j.photoTop, bottom: j.photoBottom }}
                                color={product.finishHex ?? "#1c3552"}
                              />
                            </div>
                          </details>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {j.status === "PROCESSING" && (
                            <ActionForm action={refreshModelJobAction}><input type="hidden" name="jobId" value={j.id} /><Submit variant="ghost">Check status</Submit></ActionForm>
                          )}
                          {["READY", "NEEDS_REVIEW"].includes(j.status) && (
                            <ActionForm action={approveModelJobAction}><input type="hidden" name="jobId" value={j.id} /><Submit variant="gold">Approve &amp; publish</Submit></ActionForm>
                          )}
                          <ActionForm action={regenerateModelJobAction}>
                            <input type="hidden" name="jobId" value={j.id} />
                            <select name="pipeline" defaultValue={j.pipeline} className="field !w-auto !py-2 text-sm">
                              <option value="TEXTURED">Textured</option>
                              <option value="AI">AI</option>
                            </select>
                            <Submit variant="ghost" className="ml-2">Regenerate</Submit>
                          </ActionForm>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}

function VariantForm({ productId, v, suggested, isSuper, used }: { productId: string; v?: Variant; suggested?: { sku: string; barcode: string }; isSuper: boolean; used: boolean }) {
  return (
    <ActionForm action={saveVariantAction} resetOnSuccess={!v} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={v?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="SKU"><input name="sku" defaultValue={v?.sku ?? suggested?.sku} required className="field font-mono" /></Field>
        <Field label="Barcode" hint="Scan the manufacturer EAN or keep the generated one"><input name="barcode" defaultValue={v?.barcode ?? suggested?.barcode} required className="field font-mono" /></Field>
        <Field label="Low-stock alert at"><input name="lowStockThreshold" type="number" min={0} defaultValue={v?.lowStockThreshold ?? (used ? 0 : 2)} className="field" /></Field>
        <Field label="Price (PKR)"><input name="price" type="number" min={1} defaultValue={v?.price} required className="field" /></Field>
        <Field label="Sale price (optional)"><input name="salePrice" type="number" min={1} defaultValue={v?.salePrice ?? ""} className="field" /></Field>
        {!v && <Field label="Opening stock"><input name="openingStock" type="number" min={0} defaultValue={used ? 1 : 0} className="field" /></Field>}
        <Field label="Storage"><input name="storage" defaultValue={v?.storage ?? ""} placeholder="128GB" className="field" /></Field>
        <Field label="RAM (optional)"><input name="ram" defaultValue={v?.ram ?? ""} placeholder="8GB" className="field" /></Field>
        <Field label="Colour name"><input name="color" defaultValue={v?.color ?? ""} className="field" /></Field>
        <Field label="Colour hex"><input name="colorHex" defaultValue={v?.colorHex ?? ""} placeholder="#2b2b2e" className="field" /></Field>
      </div>
      {used && (
        <div className="grid gap-3 rounded-xl bg-gold/10 p-3 sm:grid-cols-3">
          <Field label="Grade (exactly one)" hint="A different grade = a separate SKU">
            <select name="grade" defaultValue={v?.grade ?? ""} required className="field">
              <option value="">Choose grade</option>
              {Object.keys(USED_GRADES).map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Battery health %"><input name="batteryHealth" type="number" min={0} max={100} defaultValue={v?.batteryHealth ?? ""} className="field" /></Field>
          <Field label="Condition notes" className="sm:col-span-3"><textarea name="conditionNotes" rows={2} defaultValue={v?.conditionNotes ?? ""} className="field" /></Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Warranty info"><input name="warrantyInfo" defaultValue={v?.warrantyInfo ?? (used ? "30-day PB Lab hardware warranty" : "")} className="field" /></Field>
        <Field label="Return info"><input name="returnInfo" defaultValue={v?.returnInfo ?? ""} className="field" /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-5 text-sm">
        {v && <label className="flex items-center gap-2"><input type="checkbox" name="inactive" defaultChecked={!v.active} className="h-4 w-4" /> Inactive</label>}
        <label className={`flex items-center gap-2 ${isSuper ? "" : "opacity-50"}`} title={isSuper ? "" : "Owner only"}>
          <input type="checkbox" name="allowBackorder" defaultChecked={v?.allowBackorder} disabled={!isSuper} className="h-4 w-4" /> Allow selling at zero stock (owner)
        </label>
        <Submit className="ml-auto">{v ? "Save variant" : "Add variant"}</Submit>
      </div>
    </ActionForm>
  );
}
