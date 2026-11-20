/** Used phones' six-side photos — safe to import in browser code (no file storage here). */
import { DEVICE_SIDES, type DeviceSide } from "./constants";
import { parseJson } from "./format";

export type DevicePhotos = Partial<Record<DeviceSide, string>>;

/** A device's own six-side photos (used phones), in display order. */
export function devicePhotoList(json: string | null | undefined) {
  const p = parseJson<DevicePhotos>(json, {});
  return DEVICE_SIDES.filter((s) => typeof p[s.key] === "string" && p[s.key]).map((s) => ({ side: s.key, label: s.label, url: p[s.key]! }));
}
