/**
 * Automatic clean-up of skin pictures (client request): remove the white background and the peel-off strip from
 * photos of skin sheets — without cutting into normal designs.
 */
import { describe, expect, it } from "vitest";
import { findContent } from "@/lib/clean-skin-image";

type RGB = [number, number, number];

function image(w: number, h: number, paint: (x: number, y: number) => RGB) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  return d;
}

/** A busy, varied "artwork" (never one flat colour). */
const art = (x: number, y: number): RGB => [(x * 7 + y * 3) % 200 + 30, (x * 3 + y * 5) % 180 + 40, (x + y * 2) % 160 + 60];

describe("Skin picture clean-up", () => {
  it("removes the white background and a blue peel strip from a sheet photo", () => {
    const w = 300;
    const h = 450;
    const sheet = { x0: 30, y0: 35, x1: 270, y1: 415 };
    const strip = 30; // blue band at the sheet's left with yellow text marks
    const d = image(w, h, (x, y) => {
      if (x < sheet.x0 || x > sheet.x1 || y < sheet.y0 || y > sheet.y1) return [254, 254, 254];
      if (x < sheet.x0 + strip) return y % 40 < 4 && x > sheet.x0 + 10 && x < sheet.x0 + 20 ? [234, 216, 133] : [23, 43, 148];
      return art(x, y);
    });
    const { box, removed } = findContent(d, w, h);
    expect(removed).toEqual(["white border", "left peel strip"]);
    expect(box.x0).toBeGreaterThanOrEqual(sheet.x0 + strip);
    expect(box.x0).toBeLessThan(sheet.x0 + strip + 6);
    expect(box.y0).toBeGreaterThanOrEqual(sheet.y0);
    expect(box.y1).toBeLessThanOrEqual(sheet.y1);
    expect(box.x1).toBeLessThanOrEqual(sheet.x1);
  });

  it("leaves a normal design alone — even with a white sky across the top", () => {
    const d = image(200, 400, (x, y) => (y < 60 ? [252, 253, 255] : art(x, y)));
    expect(findContent(d, 200, 400)).toEqual({ box: { x0: 0, y0: 0, x1: 199, y1: 399 }, removed: [] });
  });

  it("doesn't mistake a plain dark area at the edge for a peel strip", () => {
    const d = image(200, 400, (x, y) => (x < 40 ? [13, 20, 32] : art(x, y)));
    expect(findContent(d, 200, 400).removed).toEqual([]);
  });
});
