/**
 * STRICT 3D PRODUCT COLOUR PROTECTION (master brief §6).
 * The customer product viewer uses ONLY this neutral set-up so a product's real colour is never
 * altered by lighting, reflections, exposure or effects:
 *  - every light and reflection source is pure white (no brand-coloured lights on products)
 *  - tone mapping / auto-exposure disabled (renderer runs "flat", fixed exposure 1)
 *  - no post-processing, filters or overlays on the model
 *  - photo-textured models are rendered unlit so photographed colours are reproduced exactly
 * Covered by tests/product-colour.test.ts.
 */
export const PRODUCT_LIGHTING = {
  toneMapping: "none" as const,
  exposure: 1,
  ambient: { color: "#ffffff", intensity: 1.1 },
  key: { color: "#ffffff", intensity: 1.6, position: [2, 4, 5] as [number, number, number] },
  fill: { color: "#ffffff", intensity: 0.6, position: [-3, 1, -4] as [number, number, number] },
  /** Neutral reflection panels for glossy parts (all white). */
  reflections: [
    { color: "#ffffff", intensity: 1.2, position: [0, 3, 2] as [number, number, number], scale: [6, 1, 1] as [number, number, number], rotationX: Math.PI / 2 },
    { color: "#ffffff", intensity: 0.6, position: [-4, 0, 1] as [number, number, number], scale: [1, 5, 1] as [number, number, number], rotationY: Math.PI / 2 },
    { color: "#ffffff", intensity: 0.6, position: [4, 0, 1] as [number, number, number], scale: [1, 5, 1] as [number, number, number], rotationY: -Math.PI / 2 },
  ],
};
