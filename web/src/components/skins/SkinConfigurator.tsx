"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { DEFAULT_FIT, MAX_ZOOM, MIN_ZOOM, designMode, placeImage, skinArea, skinPrice, type ImageFit, type SkinTemplate } from "@/lib/skin-template";
import type { OwnDesign } from "./ownDesign";
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
  // How the customer positioned their own picture (reset whenever they upload a different one).
  const [fitState, setFitState] = useState<{ for: string; fit: ImageFit } | null>(null);

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
  const fit = own && fitState?.for === own.dataUrl ? fitState.fit : DEFAULT_FIT;
  const setFit = (next: ImageFit) => own && setFitState({ for: own.dataUrl, fit: next });
  const adjustable = usingOwn && !showFull;

  /** Add this exact skin (type + design + model + camera) to the bag; the server re-prices it at checkout. */
  const toCart = async (buyNow: boolean) => {
    if (!type || price == null || !canBuy) return;
    // The customer's picture goes to the order exactly as they framed it (what they see = what's printed).
    const ownImage = usingOwn && own ? await cropToSkin(own, template, fit) : null;
    addToCart({
      key: `skin:${type.id}:${design ? (usingOwn ? `own-${own?.dataUrl.length ?? 0}-${fit.zoom}-${fit.x}-${fit.y}` : design.id) : "none"}:${modelId}:${cover ? 1 : 0}`,
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
      imageSize={usingOwn && own ? { w: own.width, h: own.height } : null}
      fit={usingOwn ? fit : null}
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
      <div className="min-w-0">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-b from-[#161b24] to-[#07090d] ring-1 ring-white/8">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_45%,rgba(0,119,217,.18),transparent_70%)]" />
          {/* Absolutely sized so the whole phone (or artwork) always fits the box. No 3D tilt — it rasterises the drawing and blurs it. */}
          <div
            className={cn("absolute inset-6 md:inset-10", adjustable && "cursor-grab touch-none active:cursor-grabbing")}
            onPointerDown={(e) => {
              if (!adjustable) return;
              const box = e.currentTarget.getBoundingClientRect();
              const start = { x: e.clientX, y: e.clientY, fit };
              e.currentTarget.setPointerCapture(e.pointerId);
              // Drag the picture: moving it down reveals more of its top, and so on.
              const move = (ev: PointerEvent) => setFit({ ...start.fit, x: clampPan(start.fit.x - ((ev.clientX - start.x) / (box.width * 0.5)) * 1.5), y: clampPan(start.fit.y - ((ev.clientY - start.y) / (box.height * 0.5)) * 1.5) });
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
          >
            {stage}
          </div>
          {adjustable && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[0.7rem] text-white/60">Drag the picture to adjust</p>}
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
      <div className="min-w-0">
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
            {usingOwn && <FitControls fit={fit} onChange={setFit} />}
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
              <button type="button" disabled={!canBuy} onClick={() => void toCart(false)} className="btn btn-gold disabled:opacity-50">
                <Icon name="bag" className="h-4 w-4" /> {added ? "Added — add another" : "Add to cart"}
              </button>
              <button type="button" disabled={!canBuy} onClick={() => void toCart(true)} className="btn btn-red disabled:opacity-50">
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

const clampPan = (v: number) => Math.round(Math.min(1, Math.max(-1, v)) * 100) / 100;

/** "Adjust your picture": move it up / down and left / right, and zoom — it always covers the whole skin. */
function FitControls({ fit, onChange }: { fit: ImageFit; onChange: (f: ImageFit) => void }) {
  const row = (label: string, value: number, min: number, max: number, set: (v: number) => void, ends: [string, string]) => (
    <label className="grid grid-cols-[88px_1fr] items-center gap-3 text-xs">
      <span className="font-medium text-white/80">{label}</span>
      <span className="flex items-center gap-2">
        <span className="w-9 text-right text-white/45">{ends[0]}</span>
        <input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => set(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer accent-[var(--color-gold)]" aria-label={label} />
        <span className="w-9 text-white/45">{ends[1]}</span>
      </span>
    </label>
  );
  return (
    <div className="space-y-2.5 rounded-2xl bg-black/30 p-3.5 ring-1 ring-white/10">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Adjust your picture</p>
        <button type="button" onClick={() => onChange(DEFAULT_FIT)} className="text-xs text-gold hover:underline">Reset</button>
      </div>
      {row("Up / down", fit.y, -1, 1, (y) => onChange({ ...fit, y }), ["Top", "Bottom"])}
      {row("Left / right", fit.x, -1, 1, (x) => onChange({ ...fit, x }), ["Left", "Right"])}
      {row("Zoom", fit.zoom, MIN_ZOOM, MAX_ZOOM, (zoom) => onChange({ ...fit, zoom }), ["Out", "In"])}
      <p className="text-[0.7rem] text-white/45">Zoom out to fit more of your picture (edges fill with a soft blur), then move it up or down — or just drag it on the phone.</p>
    </div>
  );
}

/** Renders the skin exactly as the customer framed it (JPEG, 1000 px wide) for printing — same as the preview. */
async function cropToSkin(own: OwnDesign, template: SkinTemplate, fit: ImageFit) {
  const area = skinArea(template);
  const img = new Image();
  img.src = own.dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = Math.round((1000 * area.h) / area.w);
  const ctx = canvas.getContext("2d");
  if (!ctx) return own.dataUrl;
  ctx.imageSmoothingQuality = "high";
  const k = canvas.width / area.w; // mm → px
  const draw = (p: { x: number; y: number; w: number; h: number }) => ctx.drawImage(img, (p.x - area.x) * k, (p.y - area.y) * k, p.w * k, p.h * k);
  const p = placeImage(area, own.width, own.height, fit);
  if (p.x > area.x + 0.05 || p.y > area.y + 0.05) {
    // Zoomed out: soft blurred fill behind the picture, like the preview. Blur = draw tiny, then scale up smoothly
    // (works in every browser; canvas `filter` isn't supported everywhere, e.g. Safari).
    const small = document.createElement("canvas");
    small.width = 24;
    small.height = Math.max(1, Math.round((24 * area.h) / area.w));
    const sctx = small.getContext("2d");
    if (sctx) {
      const s = small.width / area.w;
      const b = placeImage(area, own.width, own.height, DEFAULT_FIT);
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(img, (b.x - area.x) * s, (b.y - area.y) * s, b.w * s, b.h * s);
      ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  draw(p);
  return canvas.toDataURL("image/jpeg", 0.9);
}
