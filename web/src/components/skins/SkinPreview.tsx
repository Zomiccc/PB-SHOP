"use client";

import { useId } from "react";
import { SKIN_INSET_MM, lensLayout, placeImage, skinFocus, skinLook, type ImageFit, type SkinTemplate } from "@/lib/skin-template";

/** Drawing scale: templates are in mm; drawing at 0.1 mm keeps textures, strokes and edges crisp at any size. */
const S = 10;

/**
 * Back of a phone model drawn from its template, with a design fitted automatically (v6 §11): the artwork covers
 * the back keeping its aspect ratio, cropped around its focus point, clipped to the model's exact shape and cut
 * around the camera like a real skin. Drawn as a real phone — metal frame, side buttons, raised camera island with
 * lens rings, glass and flash. The design is always shown clean (no texture overlays); `look` only adds a light finish;
 * `photo` shows a "your photo here" placeholder for the Customize Photo Skin.
 */
export function SkinPreview({
  template: t,
  imageUrl,
  focus,
  look: lookIn = "MATTE",
  cameraCover = false,
  photo = false,
  imageSize,
  fit,
  label,
  className = "",
}: {
  template: SkinTemplate;
  imageUrl?: string | null;
  focus?: string | null;
  look?: string;
  cameraCover?: boolean;
  photo?: boolean;
  /** With `fit`: the picture's pixel size, so the customer's own positioning (zoom / pan) is applied exactly. */
  imageSize?: { w: number; h: number } | null;
  fit?: ImageFit | null;
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const look = skinLook(lookIn);
  const jelly = look === "JELLY";
  const covered = cameraCover && !jelly;

  const W = t.widthMm * S;
  const H = t.heightMm * S;
  const R = t.cornerMm * S;
  const frame = 1.1 * S; // metal rim visible around the back
  const inset = SKIN_INSET_MM * S; // skins stop just short of the rim (same as skinArea)
  const back = { x: frame, y: frame, width: W - frame * 2, height: H - frame * 2, rx: Math.max(0, R - frame) };
  const skin = { x: inset, y: inset, width: W - inset * 2, height: H - inset * 2, rx: Math.max(0, R - inset) };
  const cam = { x: t.cameraX * S, y: t.cameraY * S, width: t.cameraW * S, height: t.cameraH * S, rx: t.cameraCornerMm * S };
  const gap = 0.8 * S; // skin cut-out margin around the camera
  const cut = { x: cam.x - gap, y: cam.y - gap, width: cam.width + gap * 2, height: cam.height + gap * 2, rx: cam.rx + gap };
  const lenses = lensLayout(t).map((l) => ({ cx: l.cx * S, cy: l.cy * S, r: l.r * S }));
  const flash = flashSpot(cam, lenses);
  const pad = Math.max(W, H) * 0.06;
  const metalLight = shade(t.bodyHex, 70);
  const metalDark = shade(t.bodyHex, -35);

  return (
    <svg viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2.6}`} className={className} role="img" aria-label={label ?? "Skin preview"} shapeRendering="geometricPrecision">
      <defs>
        <clipPath id={`skin-clip-${id}`}>
          <rect {...skin} />
        </clipPath>
        {/* Skin = the back inside the rim, minus the camera cut-out (unless the camera cover is chosen). */}
        <mask id={`skin-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect {...skin} fill="#fff" />
          {!covered && <rect {...cut} fill="#000" />}
        </mask>
        <linearGradient id={`frame-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metalLight} />
          <stop offset=".45" stopColor={t.bodyHex} />
          <stop offset=".55" stopColor={metalDark} />
          <stop offset="1" stopColor={shade(t.bodyHex, 30)} />
        </linearGradient>
        <linearGradient id={`back-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(t.bodyHex, 12)} />
          <stop offset="1" stopColor={shade(t.bodyHex, -12)} />
        </linearGradient>
        {/* Soft depth at the edges — dark only, so edges never look washed out. */}
        <linearGradient id={`depth-x-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".28" />
          <stop offset=".06" stopColor="#000" stopOpacity="0" />
          <stop offset=".94" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".32" />
        </linearGradient>
        <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".32" stopColor="#fff" stopOpacity=".05" />
          <stop offset=".33" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`shadow-${id}`}>
          <stop offset="0" stopColor="#000" stopOpacity=".6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`island-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(t.bodyHex, 18)} />
          <stop offset="1" stopColor={shade(t.bodyHex, -30)} />
        </linearGradient>
        <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9ced6" />
          <stop offset=".5" stopColor="#5b616b" />
          <stop offset="1" stopColor="#1d2026" />
        </linearGradient>
        <radialGradient id={`glass-${id}`} cx=".38" cy=".35" r=".75">
          <stop offset="0" stopColor="#3a4a6b" />
          <stop offset=".45" stopColor="#0b1120" />
          <stop offset="1" stopColor="#020308" />
        </radialGradient>
        <filter id={`blur-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={2.5 * S} />
        </filter>
        <filter id={`lift-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={0.25 * S} stdDeviation={0.35 * S} floodColor="#000" floodOpacity=".55" />
        </filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx={W / 2} cy={H + pad * 0.9} rx={W * 0.46} ry={pad * 0.42} fill={`url(#shadow-${id})`} />

      {/* side buttons (right edge) */}
      <g fill={metalDark}>
        <rect x={W - 0.2 * S} y={H * 0.2} width={0.7 * S} height={H * 0.07} rx={0.3 * S} />
        <rect x={W - 0.2 * S} y={H * 0.3} width={0.7 * S} height={H * 0.12} rx={0.3 * S} />
      </g>

      {/* metal frame + back panel */}
      <rect width={W} height={H} rx={R} fill={`url(#frame-${id})`} />
      <rect {...back} fill={`url(#back-${id})`} />

      {/* the skin */}
      {!jelly && (
        <g mask={`url(#skin-${id})`}>
          <g clipPath={`url(#skin-clip-${id})`}>
            {photo ? (
              <PhotoPlaceholder box={skin} />
            ) : (
              imageUrl && (
                fit && imageSize ? (
                  // Customer-positioned picture: exact zoom / pan, always covering the skin.
                  (() => {
                    const p = placeImage({ x: skin.x, y: skin.y, w: skin.width, h: skin.height }, imageSize.w, imageSize.h, fit);
                    const smaller = p.x > skin.x + 0.5 || p.y > skin.y + 0.5;
                    return (
                      <g opacity={look === "CLEAR" ? 0.62 : 1}>
                        {/* Zoomed out: the free space is filled with a soft, darkened blur of the same picture. */}
                        {smaller && (
                          <>
                            <image href={imageUrl} x={skin.x} y={skin.y} width={skin.width} height={skin.height} preserveAspectRatio="xMidYMid slice" filter={`url(#blur-${id})`} />
                            <rect {...skin} fill="#000" opacity=".18" />
                          </>
                        )}
                        <image href={imageUrl} x={p.x} y={p.y} width={p.w} height={p.h} preserveAspectRatio="none" />
                      </g>
                    );
                  })()
                ) : (
                  <image href={imageUrl} x={skin.x} y={skin.y} width={skin.width} height={skin.height} preserveAspectRatio={`${skinFocus(focus)} slice`} opacity={look === "CLEAR" ? 0.62 : 1} />
                )
              )
            )}
            {/* The design always shows clean and smooth (client request) — no texture overlays. Materials differ only
                by a light finish: matte / leather a touch deeper, gloss / 3D / clear a soft sheen. */}
            {(look === "MATTE" || look === "LEATHER") && <rect {...skin} fill="#000" opacity={look === "LEATHER" ? 0.06 : 0.03} />}
            {(look === "GLOSS" || look === "CLEAR" || look === "TEXTURED") && <rect {...skin} fill={`url(#gloss-${id})`} />}
            <rect {...skin} fill={`url(#depth-x-${id})`} />
          </g>
          {/* hairline skin edge */}
          <rect {...skin} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth={0.12 * S} />
        </g>
      )}
      {jelly && (
        // Clear jelly case: the phone shows through a glossy translucent shell with a soft, darkened rim.
        <>
          <rect width={W} height={H} rx={R} fill="#dfe8f5" opacity=".1" />
          <rect width={W} height={H} rx={R} fill={`url(#gloss-${id})`} />
          <rect x={0.4 * S} y={0.4 * S} width={W - 0.8 * S} height={H - 0.8 * S} rx={Math.max(0, R - 0.4 * S)} fill="none" stroke="#cfd8e6" strokeOpacity=".22" strokeWidth={0.8 * S} />
        </>
      )}
      {!covered && !jelly && <rect {...cut} fill="none" stroke="#000" strokeOpacity=".3" strokeWidth={0.12 * S} />}

      {/* camera island (raised) */}
      <g filter={`url(#lift-${id})`}>
        <rect {...cam} fill={covered ? "transparent" : `url(#island-${id})`} stroke={shade(t.bodyHex, 45)} strokeOpacity=".5" strokeWidth={0.15 * S} />
      </g>
      {lenses.map((l, i) => (
        <g key={i}>
          <circle cx={l.cx} cy={l.cy} r={l.r * 1.14} fill={`url(#ring-${id})`} />
          <circle cx={l.cx} cy={l.cy} r={l.r * 0.98} fill="#0a0c10" />
          <circle cx={l.cx} cy={l.cy} r={l.r * 0.8} fill={`url(#glass-${id})`} />
          <circle cx={l.cx} cy={l.cy} r={l.r * 0.32} fill="#05070c" />
          <path d={`M ${l.cx - l.r * 0.55} ${l.cy - l.r * 0.2} A ${l.r * 0.6} ${l.r * 0.6} 0 0 1 ${l.cx - l.r * 0.1} ${l.cy - l.r * 0.58}`} stroke="#b9cdf0" strokeOpacity=".55" strokeWidth={l.r * 0.09} fill="none" strokeLinecap="round" />
        </g>
      ))}
      {flash && (
        <g>
          <circle cx={flash.cx} cy={flash.cy} r={flash.r} fill="#e9e3cf" />
          <circle cx={flash.cx} cy={flash.cy} r={flash.r * 0.6} fill="#f7f0d8" />
        </g>
      )}
      <rect width={W} height={H} rx={R} fill="none" stroke="#000" strokeOpacity=".55" strokeWidth={0.15 * S} />
    </svg>
  );
}

/** A spot for the flash inside the camera island that doesn't overlap a lens (or none if it's too tight). */
function flashSpot(cam: { x: number; y: number; width: number; height: number }, lenses: { cx: number; cy: number; r: number }[]) {
  const r = Math.min(cam.width, cam.height) * 0.07;
  const candidates = [
    { cx: cam.x + cam.width * 0.78, cy: cam.y + cam.height * 0.22 },
    { cx: cam.x + cam.width * 0.78, cy: cam.y + cam.height * 0.78 },
    { cx: cam.x + cam.width * 0.5, cy: cam.y + cam.height * 0.5 },
    { cx: cam.x + cam.width * 0.22, cy: cam.y + cam.height * 0.92 },
  ];
  return candidates.map((c) => ({ ...c, r })).find((c) => lenses.every((l) => Math.hypot(l.cx - c.cx, l.cy - c.cy) > l.r * 1.14 + c.r * 1.6)) ?? null;
}

/** "Your photo here" — for the Customize Photo Skin before the customer has added their picture. */
function PhotoPlaceholder({ box }: { box: { x: number; y: number; width: number; height: number } }) {
  const { x, y, width: w, height: h } = box;
  const cx = x + w / 2;
  const cy = y + h * 0.58;
  const s = w * 0.18;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#1b2433" />
      <rect x={x + w * 0.12} y={y + h * 0.4} width={w * 0.76} height={h * 0.36} rx={4 * S} fill="none" stroke="#d9a62e" strokeWidth={0.8 * S} strokeDasharray={`${3 * S} ${2 * S}`} />
      <path d={`M${cx - s / 2} ${cy - s * 0.25} h${s * 0.25} l${s * 0.1} -${s * 0.15} h${s * 0.3} l${s * 0.1} ${s * 0.15} h${s * 0.25} v${s * 0.65} h-${s} z`} fill="none" stroke="#d9a62e" strokeWidth={0.9 * S} strokeLinejoin="round" />
      <circle cx={cx} cy={cy + s * 0.08} r={s * 0.18} fill="none" stroke="#d9a62e" strokeWidth={0.9 * S} />
      <text x={cx} y={y + h * 0.71} textAnchor="middle" fontSize={w * 0.075} fill="#e9c56d" fontFamily="system-ui, sans-serif" fontWeight={600}>Your photo here</text>
    </g>
  );
}

/** Lighten / darken a hex colour by `amt` (−255…255). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
