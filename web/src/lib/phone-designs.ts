/**
 * Recognisable body + camera layouts per phone family, used by BOTH the procedural 3D model
 * and the product-card artwork so every listing looks like its real device until an approved
 * GLB or 6-photo model is attached.
 *
 * Coordinates are in model units (phone ≈ 0.76 × 1.58), origin at the centre, seen from the
 * BACK of the phone: x+ = viewer's right, y+ = up.
 */

export type Lens = { x: number; y: number; r: number };
export type Island = { x: number; y: number; w: number; h: number; r: number; tone?: "body" | "dark" | "glass" };
export type PhoneDesign = {
  key: string;
  w: number;
  h: number;
  d: number;
  /** body corner radius */
  r: number;
  frame: "polished" | "satin" | "flat";
  front: "island" | "notch" | "punch" | "punch-left";
  islands: Island[];
  lenses: Lens[];
  flash: Lens[];
  /** big lens "rings" standing proud of the back (Samsung-style) */
  ringed: boolean;
  logo: "apple" | "text" | "none";
  logoText?: string;
};

const base = { w: 0.76, h: 1.58, d: 0.085, r: 0.12, frame: "polished" as const, ringed: false, logo: "text" as const };

const D: Record<string, PhoneDesign> = {
  "iphone-pro": {
    ...base, key: "iphone-pro", r: 0.13, frame: "satin", front: "island", logo: "apple",
    islands: [{ x: -0.19, y: 0.56, w: 0.35, h: 0.37, r: 0.085, tone: "glass" }],
    lenses: [{ x: -0.265, y: 0.645, r: 0.062 }, { x: -0.265, y: 0.475, r: 0.062 }, { x: -0.12, y: 0.56, r: 0.062 }],
    flash: [{ x: -0.1, y: 0.68, r: 0.018 }],
  },
  "iphone-vertical": {
    ...base, key: "iphone-vertical", r: 0.13, front: "island", logo: "apple",
    islands: [{ x: -0.245, y: 0.555, w: 0.17, h: 0.34, r: 0.085, tone: "glass" }],
    lenses: [{ x: -0.245, y: 0.635, r: 0.056 }, { x: -0.245, y: 0.475, r: 0.056 }],
    flash: [{ x: -0.13, y: 0.64, r: 0.016 }],
  },
  "iphone-diagonal": {
    ...base, key: "iphone-diagonal", r: 0.12, front: "notch", logo: "apple",
    islands: [{ x: -0.2, y: 0.56, w: 0.3, h: 0.32, r: 0.075, tone: "glass" }],
    lenses: [{ x: -0.26, y: 0.625, r: 0.055 }, { x: -0.14, y: 0.495, r: 0.055 }],
    flash: [{ x: -0.12, y: 0.63, r: 0.016 }],
  },
  "iphone-classic": {
    ...base, key: "iphone-classic", r: 0.12, front: "notch", logo: "apple",
    islands: [{ x: -0.2, y: 0.56, w: 0.3, h: 0.32, r: 0.075, tone: "glass" }],
    lenses: [{ x: -0.26, y: 0.625, r: 0.055 }, { x: -0.26, y: 0.495, r: 0.055 }],
    flash: [{ x: -0.13, y: 0.63, r: 0.016 }],
  },
  "galaxy-ultra": {
    ...base, key: "galaxy-ultra", w: 0.78, h: 1.62, d: 0.082, r: 0.035, frame: "flat", front: "punch", ringed: true, logoText: "SAMSUNG",
    islands: [],
    lenses: [{ x: -0.27, y: 0.66, r: 0.06 }, { x: -0.27, y: 0.51, r: 0.06 }, { x: -0.27, y: 0.36, r: 0.06 }, { x: -0.13, y: 0.6, r: 0.042 }, { x: -0.13, y: 0.45, r: 0.042 }],
    flash: [{ x: -0.13, y: 0.7, r: 0.018 }],
  },
  "galaxy-s": {
    ...base, key: "galaxy-s", w: 0.74, h: 1.52, r: 0.11, frame: "flat", front: "punch", ringed: true, logoText: "SAMSUNG",
    islands: [],
    lenses: [{ x: -0.25, y: 0.6, r: 0.056 }, { x: -0.25, y: 0.46, r: 0.056 }, { x: -0.25, y: 0.32, r: 0.056 }],
    flash: [{ x: -0.13, y: 0.6, r: 0.016 }],
  },
  "galaxy-a": {
    ...base, key: "galaxy-a", w: 0.78, h: 1.64, d: 0.09, r: 0.1, frame: "satin", front: "punch", ringed: true, logoText: "SAMSUNG",
    islands: [],
    lenses: [{ x: -0.26, y: 0.66, r: 0.055 }, { x: -0.26, y: 0.52, r: 0.055 }, { x: -0.26, y: 0.38, r: 0.045 }],
    flash: [{ x: -0.14, y: 0.66, r: 0.016 }],
  },
  "galaxy-contour": {
    ...base, key: "galaxy-contour", w: 0.72, h: 1.5, r: 0.1, frame: "polished", front: "punch", logoText: "SAMSUNG",
    islands: [{ x: -0.25, y: 0.48, w: 0.2, h: 0.42, r: 0.06, tone: "body" }],
    lenses: [{ x: -0.25, y: 0.6, r: 0.052 }, { x: -0.25, y: 0.48, r: 0.052 }, { x: -0.25, y: 0.36, r: 0.052 }],
    flash: [{ x: -0.12, y: 0.6, r: 0.016 }],
  },
  "pixel-visor": {
    ...base, key: "pixel-visor", w: 0.74, h: 1.56, d: 0.09, r: 0.12, frame: "satin", front: "punch", logoText: "G",
    islands: [{ x: 0, y: 0.5, w: 0.74, h: 0.2, r: 0.1, tone: "dark" }],
    lenses: [{ x: -0.2, y: 0.5, r: 0.055 }, { x: -0.06, y: 0.5, r: 0.055 }],
    flash: [{ x: 0.1, y: 0.5, r: 0.016 }],
  },
  "pixel-pill": {
    ...base, key: "pixel-pill", w: 0.74, h: 1.56, d: 0.086, r: 0.13, frame: "polished", front: "punch", logoText: "G",
    islands: [{ x: 0, y: 0.5, w: 0.62, h: 0.2, r: 0.1, tone: "dark" }],
    lenses: [{ x: -0.19, y: 0.5, r: 0.056 }, { x: -0.05, y: 0.5, r: 0.056 }, { x: 0.09, y: 0.5, r: 0.045 }],
    flash: [{ x: 0.2, y: 0.5, r: 0.016 }],
  },
  "xiaomi-square": {
    ...base, key: "xiaomi-square", w: 0.74, h: 1.5, r: 0.11, frame: "flat", front: "punch", logoText: "Xiaomi",
    islands: [{ x: -0.17, y: 0.52, w: 0.38, h: 0.38, r: 0.1, tone: "dark" }],
    lenses: [{ x: -0.26, y: 0.61, r: 0.06 }, { x: -0.08, y: 0.61, r: 0.06 }, { x: -0.26, y: 0.43, r: 0.06 }],
    flash: [{ x: -0.08, y: 0.43, r: 0.022 }],
  },
  "redmi-rect": {
    ...base, key: "redmi-rect", w: 0.76, h: 1.6, d: 0.089, r: 0.1, frame: "satin", front: "punch", logoText: "Redmi",
    islands: [{ x: -0.19, y: 0.53, w: 0.3, h: 0.44, r: 0.07, tone: "dark" }],
    lenses: [{ x: -0.24, y: 0.65, r: 0.07 }, { x: -0.24, y: 0.47, r: 0.05 }, { x: -0.12, y: 0.47, r: 0.04 }],
    flash: [{ x: -0.12, y: 0.61, r: 0.016 }],
  },
  "oneplus-round": {
    ...base, key: "oneplus-round", w: 0.76, h: 1.62, d: 0.088, r: 0.12, frame: "polished", front: "punch-left", logoText: "1+",
    islands: [{ x: -0.13, y: 0.52, w: 0.42, h: 0.42, r: 0.21, tone: "dark" }],
    lenses: [{ x: -0.13, y: 0.63, r: 0.058 }, { x: -0.23, y: 0.46, r: 0.058 }, { x: -0.03, y: 0.46, r: 0.058 }],
    flash: [{ x: 0.13, y: 0.6, r: 0.016 }],
  },
  // Tablets (master brief §9)
  "ipad": {
    ...base, key: "ipad", w: 1.12, h: 1.6, d: 0.07, r: 0.09, frame: "satin", front: "punch", logo: "apple",
    islands: [{ x: -0.46, y: 0.69, w: 0.14, h: 0.14, r: 0.07, tone: "glass" }],
    lenses: [{ x: -0.46, y: 0.69, r: 0.045 }],
    flash: [],
  },
  "ipad-pro": {
    ...base, key: "ipad-pro", w: 1.12, h: 1.6, d: 0.065, r: 0.08, frame: "satin", front: "punch", logo: "apple",
    islands: [{ x: -0.42, y: 0.65, w: 0.22, h: 0.22, r: 0.06, tone: "glass" }],
    lenses: [{ x: -0.46, y: 0.69, r: 0.045 }, { x: -0.38, y: 0.61, r: 0.04 }],
    flash: [{ x: -0.38, y: 0.69, r: 0.014 }],
  },
  "galaxy-tab": {
    ...base, key: "galaxy-tab", w: 1.08, h: 1.62, d: 0.07, r: 0.07, frame: "flat", front: "punch", ringed: true, logoText: "SAMSUNG",
    islands: [],
    lenses: [{ x: -0.44, y: 0.7, r: 0.045 }, { x: -0.44, y: 0.58, r: 0.04 }],
    flash: [{ x: -0.34, y: 0.7, r: 0.014 }],
  },
  "android-tablet": {
    ...base, key: "android-tablet", w: 1.1, h: 1.6, d: 0.072, r: 0.08, frame: "satin", front: "punch", logoText: "",
    islands: [{ x: -0.42, y: 0.66, w: 0.2, h: 0.2, r: 0.1, tone: "dark" }],
    lenses: [{ x: -0.42, y: 0.66, r: 0.05 }],
    flash: [{ x: -0.3, y: 0.7, r: 0.014 }],
  },
  "android-rect": {
    ...base, key: "android-rect", w: 0.76, h: 1.6, d: 0.088, r: 0.1, frame: "satin", front: "punch", logoText: "",
    islands: [{ x: -0.18, y: 0.55, w: 0.34, h: 0.34, r: 0.08, tone: "dark" }],
    lenses: [{ x: -0.25, y: 0.62, r: 0.055 }, { x: -0.11, y: 0.62, r: 0.045 }, { x: -0.25, y: 0.48, r: 0.045 }],
    flash: [{ x: -0.11, y: 0.48, r: 0.018 }],
  },
};

/** Picks the closest real-world layout from brand + model name (and product type for tablets). */
export function designFor(brand?: string | null, name?: string | null, type?: string | null): PhoneDesign {
  const b = (brand ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (type === "TABLET" || /\bipad\b|galaxy tab|\bpad\b|\btab\b/.test(n)) {
    if (n.includes("ipad")) return n.includes("pro") ? D["ipad-pro"] : D["ipad"];
    if (b === "samsung" || n.includes("galaxy")) return D["galaxy-tab"];
    return { ...D["android-tablet"], logoText: brand ?? "" };
  }
  if (b === "apple" || n.includes("iphone")) {
    if (n.includes("pro")) return D["iphone-pro"];
    const num = Number(n.match(/iphone\s*(\d+)/)?.[1] ?? 0);
    if (num >= 15) return D["iphone-vertical"];
    if (num === 13 || num === 14) return D["iphone-diagonal"];
    return D["iphone-classic"];
  }
  if (b === "samsung" || n.includes("galaxy")) {
    if (n.includes("ultra")) return D["galaxy-ultra"];
    if (/\bs2[12]\b/.test(n)) return { ...D["galaxy-contour"], logoText: "SAMSUNG" };
    if (/\ba\d{2}/.test(n)) return D["galaxy-a"];
    return D["galaxy-s"];
  }
  if (b === "google" || n.includes("pixel")) {
    const num = Number(n.match(/pixel\s*(\d+)/)?.[1] ?? 0);
    return num >= 9 ? D["pixel-pill"] : D["pixel-visor"];
  }
  if (n.includes("redmi") || n.includes("poco")) return D["redmi-rect"];
  if (b === "xiaomi") return D["xiaomi-square"];
  if (b === "oneplus") return D["oneplus-round"];
  return { ...D["android-rect"], logoText: brand ?? "" };
}

/** Neutral PB-branded device for the home-page story. */
export const PB_DESIGN: PhoneDesign = { ...D["iphone-pro"], key: "pb", logo: "text", logoText: "PB" };
