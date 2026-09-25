"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { pkr } from "@/lib/format";

type Item = { id: string; name: string; detail: string; sku: string; barcode: string; price: number; stock: number };

/** Printable barcode labels (§6). EAN-13 when the code is a valid 13-digit EAN, otherwise Code 128. */
export function Labels({ items }: { items: Item[] }) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, Math.max(1, Math.min(i.stock, 10))])));
  const [size, setSize] = useState<"40x30" | "50x25">("40x30");
  const list = items.flatMap((i) => Array.from({ length: qty[i.id] ?? 0 }, (_, n) => ({ ...i, key: `${i.id}-${n}` })));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] print:hidden">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold">Quantities</p>
          <select value={size} onChange={(e) => setSize(e.target.value as "40x30" | "50x25")} aria-label="Label size" className="field !w-auto !py-1.5 text-sm">
            <option value="40x30">40 × 30 mm</option>
            <option value="50x25">50 × 25 mm</option>
          </select>
        </div>
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto" data-lenis-prevent>
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 text-sm">
              <input type="number" min={0} max={200} value={qty[i.id] ?? 0} onChange={(e) => setQty((q) => ({ ...q, [i.id]: Math.max(0, Number(e.target.value) || 0) }))} aria-label={`Labels for ${i.sku}`} className="field !w-20 !py-1.5" />
              <span className="min-w-0 flex-1 truncate">{i.name} <span className="text-muted">{i.detail}</span></span>
              <span className="font-mono text-xs text-muted">{i.sku}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => window.print()} disabled={!list.length} className="btn btn-red mt-4 w-full disabled:opacity-40">Print {list.length} label(s)</button>
        <p className="mt-2 text-xs text-muted">Set your label printer&apos;s paper size to match, margins to none.</p>
      </div>
      <div className="print-area flex flex-wrap content-start gap-2">
        {list.map((l) => (
          <Label key={l.key} item={l} size={size} />
        ))}
      </div>
    </div>
  );
}

function Label({ item, size }: { item: Item; size: "40x30" | "50x25" }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!svg.current) return;
    const ean = /^\d{13}$/.test(item.barcode);
    try {
      JsBarcode(svg.current, item.barcode, { format: ean ? "EAN13" : "CODE128", height: size === "40x30" ? 34 : 26, width: 1.3, fontSize: 10, margin: 0, displayValue: true, flat: true });
    } catch {
      JsBarcode(svg.current, item.barcode, { format: "CODE128", height: 30, width: 1.2, fontSize: 10, margin: 0 });
    }
  }, [item.barcode, size]);
  const [w, h] = size === "40x30" ? ["40mm", "30mm"] : ["50mm", "25mm"];
  return (
    <div className="flex flex-col items-center justify-between overflow-hidden rounded-sm border border-dashed border-ink/20 bg-white p-[1.5mm] text-black print:break-inside-avoid print:border-0" style={{ width: w, height: h }}>
      <p className="w-full truncate text-center text-[7pt] font-bold leading-tight">PB · {item.name}</p>
      {item.detail && <p className="w-full truncate text-center text-[6pt] leading-tight">{item.detail}</p>}
      <svg ref={svg} className="max-h-[60%] max-w-full" />
      <p className="flex w-full justify-between text-[7pt] font-bold leading-none"><span>{item.sku}</span><span>{pkr(item.price)}</span></p>
    </div>
  );
}
