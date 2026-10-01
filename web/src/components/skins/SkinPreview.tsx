"use client";

import { useId } from "react";
import { lensLayout, skinFocus, skinLook, type SkinTemplate } from "@/lib/skin-template";

/**
 * Back of a phone model drawn from its template (mm), with an admin-approved design fitted automatically
 * (v4 §11): the artwork is scaled to cover the whole back keeping its aspect ratio, cropped around its
 * focus point and clipped to the model's exact shape. The camera island is cut out unless the customer
 * adds the camera cover. `look` is the skin type's material (matte, gloss, clear print, 3D, leather, jelly);
 * `photo` shows a "your photo here" placeholder for the Customize Photo Skin.
 */
export function SkinPreview({
  template: t,
  imageUrl,
  focus,
  look: lookIn = "MATTE",
  cameraCover = false,
  photo = false,
  label,
  className = "",
}: {
  template: SkinTemplate;
  imageUrl?: string | null;
  focus?: string | null;
  look?: string;
  cameraCover?: boolean;
  photo?: boolean;
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const look = skinLook(lookIn);
  const jelly = look === "JELLY";
  const lenses = lensLayout(t);
  const pad = Math.max(t.widthMm, t.heightMm) * 0.06;
  const cam = { x: t.cameraX, y: t.cameraY, width: t.cameraW, height: t.cameraH, rx: t.cameraCornerMm };
  const covered = cameraCover && !jelly;
  const W = t.widthMm;
  const H = t.heightMm;

  return (
    <svg viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2.6}`} className={className} role="img" aria-label={label ?? "Skin preview"}>
      <defs>
        <clipPath id={`body-${id}`}>
          <rect width={W} height={H} rx={t.cornerMm} />
        </clipPath>
        {/* Skin area = the back minus the camera island (unless the camera cover is chosen). */}
        <mask id={`skin-${id}`}>
          <rect width={W} height={H} rx={t.cornerMm} fill="#fff" />
          {!covered && <rect {...cam} fill="#000" />}
        </mask>
        <linearGradient id={`edge-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".08" stopColor="#fff" stopOpacity="0" />
          <stop offset=".92" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".35" />
        </linearGradient>
        <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".07" />
          <stop offset=".36" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`shadow-${id}`}>
          <stop offset="0" stopColor="#000" stopOpacity=".55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        {/* 3D skin: raised micro-texture. Leather: fine grain. The lit relief becomes black with alpha =
            shadow depth, so it darkens the design without blend modes (consistent across browsers). */}
        <filter id={`tex-${id}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={look === "LEATHER" ? 0.9 : 0.35} numOctaves={look === "LEATHER" ? 3 : 2} seed="4" result="n" />
          <feDiffuseLighting in="n" surfaceScale={look === "LEATHER" ? 1.2 : 2.2} lightingColor="#fff" result="lit">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feColorMatrix in="lit" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 0 0 0 1" />
        </filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx={W / 2} cy={H + pad * 0.9} rx={W * 0.48} ry={pad * 0.45} fill={`url(#shadow-${id})`} />

      <g clipPath={`url(#body-${id})`}>
        <rect width={W} height={H} fill={t.bodyHex} />
        {!jelly && (
          <g mask={`url(#skin-${id})`}>
            {photo ? (
              <PhotoPlaceholder w={W} h={H} />
            ) : (
              imageUrl && <image href={imageUrl} width={W} height={H} preserveAspectRatio={`${skinFocus(focus)} slice`} opacity={look === "CLEAR" ? 0.6 : 1} />
            )}
            {(look === "TEXTURED" || look === "LEATHER") && <rect width={W} height={H} fill="#000" filter={`url(#tex-${id})`} opacity={look === "LEATHER" ? 0.55 : 0.45} />}
            {look === "LEATHER" && <rect width={W} height={H} fill="#000" opacity=".12" />}
            {look === "MATTE" && <rect width={W} height={H} fill="#000" opacity=".06" />}
            {(look === "GLOSS" || look === "CLEAR" || look === "TEXTURED") && <rect width={W} height={H} fill={`url(#gloss-${id})`} />}
          </g>
        )}
        {jelly && (
          // Clear jelly case: the phone shows through a glossy translucent layer with a soft rim.
          <>
            <rect width={W} height={H} fill="#fff" opacity=".1" />
            <rect width={W} height={H} fill={`url(#gloss-${id})`} />
            <rect x={1.2} y={1.2} width={W - 2.4} height={H - 2.4} rx={Math.max(0, t.cornerMm - 1.2)} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth={2.4} />
          </>
        )}
        <rect width={W} height={H} fill={`url(#edge-${id})`} />
      </g>

      {/* camera island + lenses */}
      <rect {...cam} fill={covered ? "none" : shade(t.bodyHex, -18)} stroke="#000" strokeOpacity=".45" strokeWidth={0.5} />
      {lenses.map((l, i) => (
        <g key={i}>
          <circle cx={l.cx} cy={l.cy} r={l.r * 1.12} fill="#15171b" stroke="#6b7280" strokeOpacity=".6" strokeWidth={0.4} />
          <circle cx={l.cx} cy={l.cy} r={l.r * 0.78} fill="#05070a" />
          <circle cx={l.cx - l.r * 0.28} cy={l.cy - l.r * 0.28} r={l.r * 0.18} fill="#9fb4d9" opacity=".55" />
        </g>
      ))}
      <rect width={W} height={H} rx={t.cornerMm} fill="none" stroke="#000" strokeOpacity=".6" strokeWidth={0.8} />
    </svg>
  );
}

/** "Your photo here" — for the Customize Photo Skin (customers send their photo; no upload on the site). */
function PhotoPlaceholder({ w, h }: { w: number; h: number }) {
  const cx = w / 2;
  const cy = h * 0.58;
  const s = w * 0.18;
  return (
    <g>
      <rect width={w} height={h} fill="#1b2433" />
      <rect x={w * 0.12} y={h * 0.4} width={w * 0.76} height={h * 0.36} rx={4} fill="none" stroke="#d9a62e" strokeWidth={0.8} strokeDasharray="3 2" />
      <path d={`M${cx - s / 2} ${cy - s * 0.25} h${s * 0.25} l${s * 0.1} -${s * 0.15} h${s * 0.3} l${s * 0.1} ${s * 0.15} h${s * 0.25} v${s * 0.65} h-${s} z`} fill="none" stroke="#d9a62e" strokeWidth={0.9} strokeLinejoin="round" />
      <circle cx={cx} cy={cy + s * 0.08} r={s * 0.18} fill="none" stroke="#d9a62e" strokeWidth={0.9} />
      <text x={cx} y={h * 0.71} textAnchor="middle" fontSize={w * 0.075} fill="#e9c56d" fontFamily="system-ui, sans-serif" fontWeight={600}>Your photo here</text>
    </g>
  );
}

/** Lighten / darken a hex colour by `amt` (−255…255). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
