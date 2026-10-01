"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { designMode, skinPrice, type SkinTemplate } from "@/lib/skin-template";
import { Icon } from "../ui/Icon";
import { SkinPreview } from "./SkinPreview";

type Design = { id: string; name: string; description: string | null; imageUrl: string; focus: string; price: number };
type SkinType = { id: string; name: string; description: string | null; price: number; look: string; designMode: string };

/**
 * Selected-model skin page (v4 §9 steps 4–8), laid out like the client's reference: large phone preview
 * on the left; skin type (sets the price), design and camera options on the right. Only admin-approved
 * designs for this model are offered; each is fitted to the model's template automatically.
 */
export function SkinConfigurator({
  title,
  template,
  designs,
  types,
  cameraCoverPrice,
}: {
  title: string;
  template: SkinTemplate;
  designs: Design[];
  types: SkinType[];
  cameraCoverPrice: number;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [designId, setDesignId] = useState(designs[0]?.id ?? "");
  const [camera, setCamera] = useState(false);
  const [zoom, setZoom] = useState(false);
  const type = types.find((t) => t.id === typeId) ?? null;
  const mode = designMode(type?.designMode);
  const design = mode === "DESIGN" ? (designs.find((d) => d.id === designId) ?? null) : null;
  const canCover = mode !== "PLAIN";
  const cover = camera && canCover;
  const price = type ? skinPrice(type, design, cover, cameraCoverPrice) : null;
  const maxExtra = Math.max(0, ...designs.map((d) => d.price));
  const range = types.length ? [Math.min(...types.map((t) => t.price)), Math.max(...types.map((t) => t.price + (designMode(t.designMode) === "DESIGN" ? maxExtra : 0) + (designMode(t.designMode) !== "PLAIN" ? cameraCoverPrice : 0)))] : null;
  const what = type ? `${type.name}${design ? ` — "${design.name}" design` : mode === "PHOTO" ? " with my own photo" : ""}` : "a skin";
  const message = `Hi PB Mobiles, I'd like ${what} for my ${title}${canCover ? `, camera ${cover ? "covered" : "not covered"}` : ""}${price != null ? ` (${pkr(price)})` : ""}.${mode === "PHOTO" ? " I'll send my photo here." : ""}`;
  const noDesigns = mode === "DESIGN" && designs.length === 0;

  const preview = (
    <SkinPreview
      template={template}
      imageUrl={design?.imageUrl}
      focus={design?.focus}
      look={type?.look}
      photo={mode === "PHOTO"}
      cameraCover={cover}
      label={`${type?.name ?? "Skin"}${design ? ` — ${design.name}` : ""} on ${title}`}
      className="h-full w-full"
    />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      {/* Left: large preview */}
      <div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-b from-[#161b24] to-[#07090d] ring-1 ring-white/8">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(55%_45%_at_50%_45%,rgba(0,119,217,.18),transparent_70%)]" />
          {/* Absolutely sized so the whole phone always fits the box, whatever the model's proportions. */}
          <div className="absolute inset-6 transition-transform duration-500 [transform:perspective(1400px)_rotateY(-8deg)] hover:[transform:perspective(1400px)_rotateY(0deg)] md:inset-10">{preview}</div>
          <button type="button" onClick={() => setZoom(true)} aria-label="Enlarge preview" className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-xl bg-black/50 text-white ring-1 ring-white/15 hover:bg-black/70">
            <Icon name="expand" className="h-5 w-5" />
          </button>
        </div>
        {mode === "DESIGN" && designs.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]" role="radiogroup" aria-label="Designs">
            {designs.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={d.id === designId}
                aria-label={d.name}
                onClick={() => setDesignId(d.id)}
                className={cn("h-24 w-14 shrink-0 rounded-xl bg-black/40 p-1 ring-2 transition", d.id === designId ? "ring-gold" : "ring-transparent hover:ring-white/30")}
              >
                <SkinPreview template={template} imageUrl={d.imageUrl} focus={d.focus} look={type?.look} cameraCover={cover} className="h-full w-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: title, price, options */}
      <div>
        <h1 className="display text-4xl md:text-5xl">{title} skins</h1>
        {range && <p className="mt-2 text-lg text-white/80">{range[0] === range[1] ? pkr(range[0]) : `${pkr(range[0])} – ${pkr(range[1])}`}</p>}

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
                  <p className="text-sm text-muted">Designs for this model are coming soon — ask us on WhatsApp.</p>
                ) : (
                  <select id="skin-design" value={designId} onChange={(e) => setDesignId(e.target.value)} className="field">
                    {designs.map((d) => <option key={d.id} value={d.id}>{d.name}{d.price ? ` (+${pkr(d.price)})` : ""}</option>)}
                  </select>
                )}
              </Row>
            )}
            {mode === "PHOTO" && (
              <p className="rounded-xl bg-gold/10 p-3 text-sm ring-1 ring-gold/30">
                <b className="text-gold">Your own photo:</b> order below and send us your picture on WhatsApp (or bring it to the store). We&apos;ll print it to fit your {title}.
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
            {(type.description || design?.description) && <p className="text-sm text-muted">{[type.description, design?.description].filter(Boolean).join(" · ")}</p>}

            <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Your skin</p>
                <p className="display text-3xl text-gold">{price != null ? pkr(price) : "—"}</p>
              </div>
              <p className="text-right text-xs text-muted">{type.name}{design ? <><br />{design.name}</> : null}{canCover ? <><br />{cover ? "camera covered" : "camera open"}</> : null}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <a href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
                <Icon name="chat" className="h-4 w-4" /> Order on WhatsApp
              </a>
              <Link href={`/contact?subject=${encodeURIComponent(`Custom skin — ${title}`)}`} className="btn btn-ghost-light">
                <Icon name="pin" className="h-4 w-4" /> Order in store
              </Link>
            </div>
            <p className="text-xs text-muted">Preview is a guide: every skin is cut for the {title} and fitted by our lab.</p>
          </div>
        )}
      </div>

      {zoom && (
        <div role="dialog" aria-modal aria-label="Skin preview" className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-6" onClick={() => setZoom(false)}>
          <div className="h-[88vh] w-full max-w-xl">{preview}</div>
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
