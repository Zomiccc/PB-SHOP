"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { designMode, skinPrice, type SkinTemplate } from "@/lib/skin-template";
import { Icon } from "../ui/Icon";
import { SkinPreview } from "./SkinPreview";
import { OwnDesignUpload } from "./OwnDesignUpload";
import { useOwnDesign } from "./ownDesign";
import { useCart } from "@/store/cart";

type Design = { id: string; name: string; description: string | null; imageUrl: string; fullImageUrl: string | null; focus: string; price: number };
type SkinType = { id: string; name: string; description: string | null; price: number; look: string; designMode: string };
type ModelLink = { brand: string; name: string; href: string };

const OWN = "own";

/**
 * Selected-model skin page (v4 §9, v6 §4–§5, §11), laid out like the client's reference: large phone preview on
 * the left; skin type (sets the price), design and camera options on the right. Customers can pick one of our
 * admin-approved designs or preview their own picture (kept on their device), switch to the full / uncut artwork,
 * and change model while keeping their design. Every design is fitted to the model's template automatically.
 */
export function SkinConfigurator({
  title,
  modelId,
  currentHref,
  template,
  designs,
  types,
  cameraCoverPrice,
  models,
}: {
  title: string;
  modelId: string;
  currentHref: string;
  template: SkinTemplate;
  designs: Design[];
  types: SkinType[];
  cameraCoverPrice: number;
  models: ModelLink[];
}) {
  const router = useRouter();
  const own = useOwnDesign();
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [picked, setPicked] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [view, setView] = useState<"phone" | "full">("phone");
  const [zoom, setZoom] = useState(false);

  const type = types.find((t) => t.id === typeId) ?? null;
  const mode = designMode(type?.designMode);
  // The customer's own picture is used when chosen, and automatically for the "Customize Photo" type.
  const designId = picked && (picked !== OWN || own) ? picked : own ? OWN : designs[0]?.id ?? "";
  const ownDesign: Design | null = own ? { id: OWN, name: "Your design", description: null, imageUrl: own.dataUrl, fullImageUrl: own.dataUrl, focus: "xMidYMid", price: 0 } : null;
  const chosen = designId === OWN ? ownDesign : (designs.find((d) => d.id === designId) ?? null);
  const showOwnPhoto = mode === "PHOTO" && !!ownDesign;
  const design = mode === "DESIGN" ? chosen : showOwnPhoto ? ownDesign : null;
  const usingOwn = design?.id === OWN;
  const canCover = mode !== "PLAIN";
  const cover = camera && canCover;
  const price = type ? skinPrice(type, usingOwn ? { price: 0 } : design, cover, cameraCoverPrice) : null;
  const maxExtra = Math.max(0, ...designs.map((d) => d.price));
  const range = types.length ? [Math.min(...types.map((t) => t.price)), Math.max(...types.map((t) => t.price + (designMode(t.designMode) === "DESIGN" ? maxExtra : 0) + (designMode(t.designMode) !== "PLAIN" ? cameraCoverPrice : 0)))] : null;
  const fullUrl = design ? design.fullImageUrl ?? design.imageUrl : null;
  const showFull = view === "full" && !!fullUrl;

  const what = type ? `${type.name}${usingOwn ? " with my own design" : design ? ` — "${design.name}" design` : mode === "PHOTO" ? " with my own photo" : ""}` : "a skin";
  const message = `Hi PB Mobiles, I'd like ${what} for my ${title}${canCover ? `, camera ${cover ? "covered" : "not covered"}` : ""}${price != null ? ` (${pkr(price)})` : ""}.${usingOwn || mode === "PHOTO" ? " I'll send my picture here." : ""}`;
  const noDesigns = mode === "DESIGN" && designs.length === 0 && !ownDesign;
  const addToCart = useCart((s) => s.add);
  const [added, setAdded] = useState(false);
  const canBuy = !!type && price != null && !(mode === "DESIGN" && !design);
  const ownImage = usingOwn && own ? own.dataUrl : null;

  /** Add this exact skin (type + design + model + camera) to the bag; the server re-prices it at checkout. */
  const toCart = (buyNow: boolean) => {
    if (!type || price == null || !canBuy) return;
    addToCart({
      key: `skin:${type.id}:${design ? (usingOwn ? `own-${own?.dataUrl.length ?? 0}` : design.id) : "none"}:${modelId}:${cover ? 1 : 0}`,
      variantId: "",
      slug: currentHref.replace(/^\//, ""),
      name: type.name,
      variantLabel: [title, usingOwn ? "Your design" : design?.name ?? (mode === "PHOTO" ? "Your photo (send on WhatsApp)" : null), canCover ? (cover ? "camera covered" : "camera open") : null].filter(Boolean).join(" · "),
      sku: "Made to order",
      price,
      qty: 1,
      maxQty: 5,
      kind: "SKIN",
      skin: { typeId: type.id, modelId, designId: usingOwn ? null : design?.id ?? null, cameraCover: cover, ownImage, template, imageUrl: usingOwn ? null : design?.imageUrl ?? null, look: type.look },
    });
    if (buyNow) {
      useCart.getState().setOpen(false);
      router.push("/checkout");
    } else setAdded(true);
  };

  const phone = (
    <SkinPreview
      template={template}
      imageUrl={design?.imageUrl}
      focus={design?.focus}
      look={type?.look}
      photo={mode === "PHOTO" && !showOwnPhoto}
      cameraCover={cover}
      label={`${type?.name ?? "Skin"}${design ? ` — ${design.name}` : ""} on ${title}`}
      className="h-full w-full"
    />
  );
  // eslint-disable-next-line @next/next/no-img-element -- full / uncut artwork at its own proportions (admin upload or the customer's own picture)
  const full = fullUrl ? <img src={fullUrl} alt={`${design?.name ?? "Skin"} — full artwork`} className="h-full w-full object-contain" /> : null;
  const stage = showFull ? full : phone;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      {/* Left: large preview */}
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-b from-[#161b24] to-[#07090d] ring-1 ring-white/8">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_45%,rgba(0,119,217,.18),transparent_70%)]" />
          {/* Absolutely sized so the whole phone (or artwork) always fits the box. No 3D tilt — it rasterises the drawing and blurs it. */}
          <div className="absolute inset-6 md:inset-10">{stage}</div>
          {fullUrl && (
            <div role="tablist" aria-label="Preview" className="absolute left-4 top-4 flex rounded-full bg-black/60 p-1 text-xs ring-1 ring-white/15">
              {(["phone", "full"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("rounded-full px-3 py-1.5 font-semibold transition", view === v ? "bg-gold text-[#120d02]" : "text-white/70 hover:text-white")}>
                  {v === "phone" ? "On phone" : "Full artwork"}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setZoom(true)} aria-label="Enlarge preview" className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-xl bg-black/50 text-white ring-1 ring-white/15 hover:bg-black/70">
            <Icon name="expand" className="h-5 w-5" />
          </button>
        </div>
        {mode === "DESIGN" && designs.length + (ownDesign ? 1 : 0) > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]" role="radiogroup" aria-label="Designs">
            {[...(ownDesign ? [ownDesign] : []), ...designs].map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={d.id === designId}
                aria-label={d.name}
                onClick={() => setPicked(d.id)}
                className={cn("relative h-24 w-14 shrink-0 rounded-xl bg-black/40 p-1 ring-2 transition", d.id === designId ? "ring-gold" : "ring-transparent hover:ring-white/30")}
              >
                <SkinPreview template={template} imageUrl={d.imageUrl} focus={d.focus} look={type?.look} cameraCover={cover} className="h-full w-full" />
                {d.id === OWN && <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gold py-0.5 text-[0.55rem] font-bold text-[#120d02]">YOURS</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: title, price, options */}
      <div>
        <h1 className="display text-4xl md:text-5xl">{title} skins</h1>
        {range && <p className="mt-2 text-lg text-white/80">{range[0] === range[1] ? pkr(range[0]) : `${pkr(range[0])} – ${pkr(range[1])}`}</p>}

        {models.length > 1 && (
          <label className="mt-4 block max-w-sm">
            <span className="label">Change model</span>
            <select value={currentHref} onChange={(e) => router.push(e.target.value)} className="field">
              {[...new Set(models.map((m) => m.brand))].map((b) => (
                <optgroup key={b} label={b}>
                  {models.filter((m) => m.brand === b).map((m) => <option key={m.href} value={m.href}>{b} {m.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        )}

        {!type ? (
          <div className="card mt-6 p-6">
            <p className="font-semibold">Skins for this model are coming soon.</p>
            <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-5">Ask on WhatsApp</a>
          </div>
        ) : (
          <div className="card mt-6 space-y-5 p-5 md:p-6">
            <Row label="Skin type" htmlFor="skin-type">
              <select id="skin-type" value={typeId} onChange={(e) => setTypeId(e.target.value)} className="field">
                {types.map((t) => <option key={t.id} value={t.id}>{t.name} — {pkr(t.price)}</option>)}
              </select>
            </Row>
            {mode === "DESIGN" && (
              <Row label="Choose your design" htmlFor="skin-design">
                {noDesigns ? (
                  <p className="text-sm text-muted">Designs for this model are coming soon — upload your own below, or ask us on WhatsApp.</p>
                ) : (
                  <select id="skin-design" value={designId} onChange={(e) => setPicked(e.target.value)} className="field">
                    {ownDesign && <option value={OWN}>Your design (uploaded)</option>}
                    {designs.map((d) => <option key={d.id} value={d.id}>{d.name}{d.price ? ` (+${pkr(d.price)})` : ""}</option>)}
                  </select>
                )}
              </Row>
            )}
            {mode !== "PLAIN" && <OwnDesignUpload compact onChange={() => setPicked(OWN)} />}
            {mode === "PHOTO" && !ownDesign && (
              <p className="rounded-xl bg-gold/10 p-3 text-sm ring-1 ring-gold/30">
                <b className="text-gold">Your own photo:</b> upload it above to preview it on your {title}, then order and send it to us on WhatsApp (or bring it to the store).
              </p>
            )}
            {canCover && (
              <Row label="Camera" htmlFor="skin-camera">
                <select id="skin-camera" value={cover ? "yes" : "no"} onChange={(e) => setCamera(e.target.value === "yes")} className="field">
                  <option value="no">Leave camera uncovered</option>
                  <option value="yes">Cover the camera island{cameraCoverPrice ? ` (+${pkr(cameraCoverPrice)})` : ""}</option>
                </select>
              </Row>
            )}
            {(type.description || (design && !usingOwn && design.description)) && <p className="text-sm text-muted">{[type.description, !usingOwn && design?.description].filter(Boolean).join(" · ")}</p>}

            <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Your skin</p>
                <p className="display text-3xl text-gold">{price != null ? pkr(price) : "—"}</p>
              </div>
              <p className="text-right text-xs text-muted">{type.name}{design ? <><br />{design.name}</> : null}{canCover ? <><br />{cover ? "camera covered" : "camera open"}</> : null}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={!canBuy} onClick={() => toCart(false)} className="btn btn-gold disabled:opacity-50">
                <Icon name="bag" className="h-4 w-4" /> {added ? "Added — add another" : "Add to cart"}
              </button>
              <button type="button" disabled={!canBuy} onClick={() => toCart(true)} className="btn btn-red disabled:opacity-50">
                Buy now <Icon name="arrow-right" className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
              <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gold hover:underline">
                <Icon name="chat" className="h-4 w-4" /> Order on WhatsApp
              </a>
              <Link href={`/contact?subject=${encodeURIComponent(`Custom skin — ${title}`)}`} className="flex items-center gap-1.5 text-white/70 hover:text-white hover:underline">
                <Icon name="pin" className="h-4 w-4" /> Order in store
              </Link>
            </div>
            <p className="text-xs text-muted">{usingOwn ? "Your picture is sent with your order so our lab can print it — it isn't added to our designs." : `Preview is a guide: every skin is cut for the ${title} and fitted by our lab.`}</p>
          </div>
        )}
      </div>

      {zoom && (
        <div role="dialog" aria-modal aria-label="Skin preview" className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-6" onClick={() => setZoom(false)}>
          <div className="h-[88vh] w-full max-w-xl">{stage}</div>
          <button type="button" onClick={() => setZoom(false)} aria-label="Close" className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white">
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[150px_1fr]">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
