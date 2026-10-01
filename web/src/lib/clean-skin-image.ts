/**
 * Cleans a skin picture before it's used (client request): photos of skin sheets come with a white background
 * around the sheet (and its rounded corners) and a coloured peel-off strip down one side (code, size, logo).
 * Neither may be printed, so both are removed automatically. Browser-only (canvas); used for admin uploads,
 * bulk uploads and customers' own pictures.
 *
 *  1. White border: trimmed only when the picture has a white margin on at least three sides (a product photo),
 *     so light skies or white areas inside a real design are never cut.
 *  2. Peel strip: a strongly coloured band along one edge, at least ~85% one colour over the full height
 *     (or width), 2–30% of the size, ending in a sharp edge. Dark / grey plain backgrounds don't count.
 *  3. Rounded sheet corners: after trimming a white border, edges are inset just enough that no corner is white.
 */

type Box = { x0: number; y0: number; x1: number; y1: number }; // inclusive pixel bounds

const ANALYSE_EDGE = 800;
const OUTPUT_EDGE = 2400;

export type CleanResult = { file: File; changed: boolean; removed: string[] };

export async function cleanSkinImage(file: File): Promise<CleanResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file, changed: false, removed: [] };
  }
  const scale = Math.min(1, ANALYSE_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const probe = document.createElement("canvas");
  probe.width = w;
  probe.height = h;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return { file, changed: false, removed: [] };
  pctx.fillStyle = "#fff"; // transparent areas count as background
  pctx.fillRect(0, 0, w, h);
  pctx.drawImage(bitmap, 0, 0, w, h);
  const data = pctx.getImageData(0, 0, w, h).data;

  const { box, removed } = findContent(data, w, h);
  if (!removed.length) return { file, changed: false, removed };

  // Crop the full-resolution picture to the found box.
  const k = 1 / scale;
  const sx = Math.round(box.x0 * k);
  const sy = Math.round(box.y0 * k);
  const sw = Math.max(1, Math.round((box.x1 - box.x0 + 1) * k));
  const sh = Math.max(1, Math.round((box.y1 - box.y0 + 1) * k));
  const out = Math.min(1, OUTPUT_EDGE / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * out);
  canvas.height = Math.round(sh * out);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, changed: false, removed: [] };
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  if (!blob) return { file, changed: false, removed: [] };
  return { file: new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() }), changed: true, removed };
}

/** Pure analysis on RGBA pixels: the box to keep, and what was removed. Exported for tests. */
export function findContent(data: Uint8ClampedArray, w: number, h: number) {
  const at = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  const isBg = (p: readonly number[]) => Math.min(p[0], p[1], p[2]) >= 243 && Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) <= 12;
  const step = Math.max(1, Math.round(Math.max(w, h) / 400));
  const rowBg = (y: number, b: Box) => frac(b.x0, b.x1, (x) => isBg(at(x, y)));
  const colBg = (x: number, b: Box) => frac(b.y0, b.y1, (y) => isBg(at(x, y)));
  function frac(a: number, z: number, test: (v: number) => boolean) {
    let n = 0;
    let hit = 0;
    for (let v = a; v <= z; v += step) {
      n++;
      if (test(v)) hit++;
    }
    return n ? hit / n : 0;
  }

  const removed: string[] = [];
  let box: Box = { x0: 0, y0: 0, x1: w - 1, y1: h - 1 };

  // 1. White border (product photo of a sheet).
  const t: Box = { ...box };
  while (t.y0 < h / 3 && rowBg(t.y0, t) > 0.92) t.y0++;
  while (t.y1 > (2 * h) / 3 && rowBg(t.y1, t) > 0.92) t.y1--;
  while (t.x0 < w / 3 && colBg(t.x0, t) > 0.92) t.x0++;
  while (t.x1 > (2 * w) / 3 && colBg(t.x1, t) > 0.92) t.x1--;
  const margin = (v: number, size: number) => v >= Math.max(2, size * 0.01);
  const sides = [margin(t.x0, w), margin(t.y0, h), margin(w - 1 - t.x1, w), margin(h - 1 - t.y1, h)].filter(Boolean).length;
  const trimmedWhite = sides >= 3;
  if (trimmedWhite) {
    box = t;
    removed.push("white border");
  }

  // 2. Coloured peel strip along any edge.
  const close = (a: readonly number[], b: readonly number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 90;
  const strip = (side: "left" | "right" | "top" | "bottom") => {
    const vertical = side === "left" || side === "right";
    const len = vertical ? box.x1 - box.x0 + 1 : box.y1 - box.y0 + 1;
    const span = vertical ? [box.y0 + Math.round((box.y1 - box.y0) * 0.05), box.y1 - Math.round((box.y1 - box.y0) * 0.05)] : [box.x0 + Math.round((box.x1 - box.x0) * 0.05), box.x1 - Math.round((box.x1 - box.x0) * 0.05)];
    const lineAt = (d: number) => (side === "left" ? box.x0 + d : side === "right" ? box.x1 - d : side === "top" ? box.y0 + d : box.y1 - d);
    const pixel = (line: number, v: number) => (vertical ? at(line, v) : at(v, line));
    // Reference colour a few pixels in (skips anti-aliased edges): the median-brightness sample.
    const samples: (readonly number[])[] = [];
    for (let v = span[0]; v <= span[1]; v += step) samples.push(pixel(lineAt(Math.min(len - 1, 4)), v));
    samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    const ref = samples[Math.floor(samples.length / 2)];
    if (!ref || Math.max(...ref) - Math.min(...ref) < 60) return 0; // plain dark / grey / white isn't a peel strip
    const share = (d: number) => frac(span[0], span[1], (v) => close(pixel(lineAt(d), v), ref));
    let d = 0;
    while (d < 4 && share(d) < 0.85) d++; // anti-aliased first columns
    if (share(d) < 0.85) return 0;
    while (d < len && share(d) >= 0.55) d++;
    const width = d;
    if (width < len * 0.02 || width > len * 0.3) return 0;
    // Sharp edge: just past the strip, the colour is gone.
    if (share(Math.min(len - 1, width + 2)) > 0.2) return 0;
    return width + Math.max(1, Math.round(len * 0.004)); // tiny safety margin
  };
  for (const side of ["left", "right", "top", "bottom"] as const) {
    const cut = strip(side);
    if (!cut) continue;
    if (side === "left") box = { ...box, x0: box.x0 + cut };
    if (side === "right") box = { ...box, x1: box.x1 - cut };
    if (side === "top") box = { ...box, y0: box.y0 + cut };
    if (side === "bottom") box = { ...box, y1: box.y1 - cut };
    removed.push(`${side} peel strip`);
  }

  // 3. Rounded sheet corners: inset until no corner is white (capped at 4%).
  if (trimmedWhite) {
    const cap = Math.round(Math.min(box.x1 - box.x0, box.y1 - box.y0) * 0.04);
    const cornerInset = (cx: number, cy: number, dx: number, dy: number) => {
      for (let k = 0; k <= cap; k++) if (!isBg(at(cx + dx * k, cy + dy * k))) return k;
      return cap;
    };
    // Corners next to a removed strip aren't rounded (0); light skies can over-read — the smallest rounded one is right.
    const rounded = [cornerInset(box.x0, box.y0, 1, 1), cornerInset(box.x1, box.y0, -1, 1), cornerInset(box.x0, box.y1, 1, -1), cornerInset(box.x1, box.y1, -1, -1)].filter((k) => k > 0);
    const ins = rounded.length ? Math.min(...rounded) : 0;
    const inset = ins > 0 ? ins + 1 : 0;
    if (inset) box = { x0: box.x0 + inset, y0: box.y0 + inset, x1: box.x1 - inset, y1: box.y1 - inset };
  }
  return { box, removed };
}
