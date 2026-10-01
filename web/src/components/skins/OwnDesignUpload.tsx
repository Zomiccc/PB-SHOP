"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { clearOwnDesign, setOwnDesignFromFile, useOwnDesign } from "./ownDesign";

/**
 * "Upload your own design" (v6 §4): pick a picture from the phone gallery to preview it on any model. The picture
 * stays on this device — it isn't sent to us and never becomes one of our catalogue designs.
 */
export function OwnDesignUpload({ onChange, compact = false }: { onChange?: () => void; compact?: boolean }) {
  const id = useId();
  const own = useOwnDesign();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <div className={cn("rounded-2xl ring-1 ring-gold/30", compact ? "bg-gold/5 p-3" : "bg-gold/10 p-4")}>
      <div className="flex items-center gap-3">
        {own ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the customer's own picture (data URL)
          <img src={own.dataUrl} alt="" className="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/20" />
        ) : (
          <span className="grid h-14 w-10 shrink-0 place-items-center rounded-md border border-dashed border-gold/50 text-gold"><Icon name="upload" className="h-4 w-4" /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{own ? "Your design is ready to preview" : "Have your own design?"}</p>
          <p className="text-xs text-muted">{own ? `${own.name} · stays on your device` : "Upload a picture from your gallery and see it on any phone."}</p>
        </div>
        <label htmlFor={id} className={cn("btn shrink-0 cursor-pointer !py-2 !text-sm", own ? "btn-ghost-light" : "btn-gold")}>
          {busy ? "Loading…" : own ? "Change" : "Upload"}
        </label>
        <input
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setProblem(null);
            try {
              await setOwnDesignFromFile(file);
              onChange?.();
            } catch (err) {
              setProblem(err instanceof Error ? err.message : "Couldn't load that picture");
            } finally {
              setBusy(false);
            }
          }}
        />
        {own && (
          <button type="button" onClick={clearOwnDesign} aria-label="Remove my design" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>
      {problem && <p role="alert" className="mt-2 text-xs text-red">{problem}</p>}
    </div>
  );
}
