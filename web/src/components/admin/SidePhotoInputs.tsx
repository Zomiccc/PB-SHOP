import { DEVICE_SIDES } from "@/lib/constants";
import { devicePhotoList } from "@/lib/device-photo-list";

/** Six photo boxes for a used phone (front, back, left, right, top, bottom). On a phone each opens the camera. */
export function SidePhotoInputs({ current }: { current?: string | null }) {
  const have = Object.fromEntries(devicePhotoList(current).map((p) => [p.side, p.url]));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {DEVICE_SIDES.map((s) => (
        <label key={s.key} className="flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed border-ink/15 p-3 text-sm transition hover:border-gold">
          <span className="font-semibold">{s.label}</span>
          {have[s.key] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={have[s.key]} alt={`${s.label} photo`} className="aspect-square w-full rounded-lg bg-black/30 object-contain" />
          ) : (
            <span className="grid aspect-square w-full place-items-center rounded-lg bg-black/20 text-xs text-muted">No photo yet</span>
          )}
          <input type="file" name={`photo_${s.key}`} accept="image/jpeg,image/png,image/webp" capture="environment" className="text-xs" />
        </label>
      ))}
    </div>
  );
}
