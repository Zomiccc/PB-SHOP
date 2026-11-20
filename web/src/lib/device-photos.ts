import { parseJson } from "./format";
import { DEVICE_SIDES } from "./constants";
import { saveUpload, StorageUnavailableError } from "./storage";
import type { DevicePhotos } from "./device-photo-list";

export { devicePhotoList, type DevicePhotos } from "./device-photo-list";

/**
 * Saves the six-side photo uploads in a form (fields `photo_front` … `photo_bottom`) over the device's current
 * photos: a new file replaces that side, an empty field keeps it. `skipped` = no file storage on this server.
 */
export async function saveDevicePhotos(f: FormData, current: string | null | undefined) {
  const photos = parseJson<DevicePhotos>(current, {});
  let skipped = false;
  for (const s of DEVICE_SIDES) {
    const file = f.get(`photo_${s.key}`);
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      photos[s.key] = await saveUpload(file, "products");
    } catch (e) {
      if (!(e instanceof StorageUnavailableError)) throw e;
      skipped = true;
    }
  }
  return { json: JSON.stringify(photos), skipped };
}
