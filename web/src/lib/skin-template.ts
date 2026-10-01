/**
 * Custom Skins templates (Passport requirements v4 §9–§11). Pure — used by the customer preview, the
 * admin template editor and the server.
 *
 * Each phone model has a template in millimetres: the back's size and corner radius, and the camera
 * island's position/size. A skin's artwork is fitted to that template automatically: scaled to cover the
 * whole back while keeping its aspect ratio, cropped around the admin-chosen focus point.
 */

export type SkinTemplate = {
  widthMm: number;
  heightMm: number;
  cornerMm: number;
  cameraX: number;
  cameraY: number;
  cameraW: number;
  cameraH: number;
  cameraCornerMm: number;
  lenses: number;
  bodyHex: string;
};

/** Where the artwork is anchored when it has to be cropped to the phone's shape (SVG preserveAspectRatio). */
export const SKIN_FOCUS = {
  xMidYMid: "Centre",
  xMidYMin: "Top",
  xMidYMax: "Bottom",
  xMinYMid: "Left",
  xMaxYMid: "Right",
} as const;
export type SkinFocus = keyof typeof SKIN_FOCUS;
export const skinFocus = (f: string | null | undefined): SkinFocus => (f && f in SKIN_FOCUS ? (f as SkinFocus) : "xMidYMid");

/** Preview looks a skin type can have (Admin → Custom skins → Skin types). */
export const SKIN_LOOKS = {
  MATTE: "Matte",
  GLOSS: "Gloss",
  CLEAR: "Transparent (design printed on clear)",
  TEXTURED: "3D (soft sheen)",
  LEATHER: "Leather (deep matte)",
  JELLY: "Clear jelly case",
} as const;
export type SkinLook = keyof typeof SKIN_LOOKS;
export const skinLook = (l: string | null | undefined): SkinLook => (l && l in SKIN_LOOKS ? (l as SkinLook) : "MATTE");

/** What the customer chooses for a skin type: one of our designs, their own photo, or nothing (plain). */
export const DESIGN_MODES = {
  DESIGN: "Customer picks one of our designs",
  PHOTO: "Customer's own photo (sent on WhatsApp / in store)",
  PLAIN: "No design (e.g. transparent jelly)",
} as const;
export type DesignMode = keyof typeof DESIGN_MODES;
export const designMode = (m: string | null | undefined): DesignMode => (m && m in DESIGN_MODES ? (m as DesignMode) : "DESIGN");

/** Lens centres + radius inside the camera island (mm), for 1–4 lenses. */
export function lensLayout(t: Pick<SkinTemplate, "cameraX" | "cameraY" | "cameraW" | "cameraH" | "lenses">) {
  const n = Math.min(4, Math.max(1, Math.round(t.lenses)));
  const { cameraX: x, cameraY: y, cameraW: w, cameraH: h } = t;
  // Tall island → lenses in a column; square-ish island → 2-column grid (iPhone Pro style for 3).
  if (h > w * 1.4) {
    const r = Math.min(w * 0.36, (h / n) * 0.36);
    return Array.from({ length: n }, (_, i) => ({ cx: x + w / 2, cy: y + (h / n) * (i + 0.5), r }));
  }
  if (w > h * 1.4) {
    const r = Math.min(h * 0.36, (w / n) * 0.36);
    return Array.from({ length: n }, (_, i) => ({ cx: x + (w / n) * (i + 0.5), cy: y + h / 2, r }));
  }
  const r = Math.min(w, h) * 0.2;
  const col = (c: number) => x + w * (c === 0 ? 0.3 : 0.7);
  const row = (c: number) => y + h * (c === 0 ? 0.3 : c === 1 ? 0.7 : 0.5);
  const spots = n === 1 ? [[0.5, 0.5]] : n === 2 ? [[0, 0], [0, 1]] : n === 3 ? [[0, 0], [0, 1], [1, 2]] : [[0, 0], [1, 0], [0, 1], [1, 1]];
  return spots.map(([c, rw]) => ({ cx: c === 0.5 ? x + w / 2 : col(c), cy: rw === 0.5 ? y + h / 2 : row(rw), r }));
}

/** Returns a problem with an admin-entered template, or null. */
export function templateProblem(t: SkinTemplate) {
  if (!(t.widthMm >= 40 && t.widthMm <= 250) || !(t.heightMm >= 60 && t.heightMm <= 350)) return "Width must be 40–250 mm and height 60–350 mm";
  if (t.cornerMm < 0 || t.cornerMm > t.widthMm / 2) return "Corner radius is too large for this width";
  if (t.cameraW <= 0 || t.cameraH <= 0) return "Camera size must be more than 0";
  if (t.cameraX < 0 || t.cameraY < 0 || t.cameraX + t.cameraW > t.widthMm || t.cameraY + t.cameraH > t.heightMm) return "The camera must sit inside the phone's back";
  if (t.cameraCornerMm < 0 || t.cameraCornerMm > Math.min(t.cameraW, t.cameraH) / 2) return "Camera corner radius is too large";
  if (!Number.isInteger(t.lenses) || t.lenses < 1 || t.lenses > 4) return "Lenses must be 1–4";
  if (!/^#[0-9a-f]{6}$/i.test(t.bodyHex)) return "Body colour must be a hex colour like #2b2f36";
  return null;
}

/**
 * Price the customer pays: the skin type's price, plus the design's optional extra charge (only when the
 * type uses our designs), plus the camera-cover add-on (not offered on plain / jelly types).
 */
export function skinPrice(type: { price: number; designMode: string }, design: { price: number } | null, cameraCover: boolean, cameraCoverPrice: number) {
  const mode = designMode(type.designMode);
  return type.price + (mode === "DESIGN" && design ? design.price : 0) + (cameraCover && mode !== "PLAIN" ? cameraCoverPrice : 0);
}

/** The printed skin stops just short of the metal rim: 1.1 mm frame + 0.35 mm margin. */
export const SKIN_INSET_MM = 1.45;

/** The skin area on a model's back, in mm. */
export function skinArea(t: Pick<SkinTemplate, "widthMm" | "heightMm">) {
  return { x: SKIN_INSET_MM, y: SKIN_INSET_MM, w: t.widthMm - SKIN_INSET_MM * 2, h: t.heightMm - SKIN_INSET_MM * 2 };
}

/**
 * How the customer positioned their own picture: zoom (1 = fills the skin; below 1 = zoomed out so more of the picture
 * shows, the rest filled with a soft blur of it), and x / y pan from −1 to 1 (−1 = towards the left / top, 1 = the
 * right / bottom). There are never empty edges at any setting.
 */
export type ImageFit = { zoom: number; x: number; y: number };
export const DEFAULT_FIT: ImageFit = { zoom: 1, x: 0, y: 0 };
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 3;

/** Where the picture sits (same units as `area`) for a fit: sized to cover the area at zoom 1, then zoomed and panned. */
export function placeImage(area: { x: number; y: number; w: number; h: number }, imgW: number, imgH: number, fit: ImageFit) {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit.zoom || 1));
  const scale = Math.max(area.w / imgW, area.h / imgH) * zoom;
  const w = imgW * scale;
  const h = imgH * scale;
  const pan = (v: number) => Math.min(1, Math.max(-1, v || 0));
  // pan −1 → image's left/top edge at the area's edge; +1 → right/bottom edge at the area's edge.
  return { x: area.x + ((area.w - w) / 2) * (1 + pan(fit.x)), y: area.y + ((area.h - h) / 2) * (1 + pan(fit.y)), w, h };
}
