"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { PassportCard } from "../home/PassportCard";

/**
 * Printable PB Rewards / Phone Passport card: front + back at the standard bank-card size
 * (85.6 × 54 mm). The back carries a scannable Code 128 barcode of the unique Passport ID.
 */
export function PassportCardPrint({ name, number, points, phone, since }: { name: string; number: string; points: number; phone: string; since: string }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svg.current) JsBarcode(svg.current, number, { format: "CODE128", height: 38, width: 1.6, fontSize: 12, margin: 0, displayValue: true, background: "#ffffff", lineColor: "#000000" });
  }, [number]);

  return (
    <div className="print-area print-cards flex flex-wrap gap-6">
      <style>{`@media print { @page { size: 85.6mm 54mm; margin: 0; } .print-cards { gap: 0 !important; } .print-card { width: 85.6mm !important; height: 54mm !important; break-after: page; border-radius: 0 !important; box-shadow: none !important; } }`}</style>
      <div className="print-card w-[428px] max-w-full">
        <PassportCard still name={name} number={number} points={points} />
      </div>
      <div className="print-card print-exact @container relative aspect-[1.586] w-[428px] max-w-full overflow-hidden rounded-[4.5cqw] bg-[#05070b] text-white ring-1 ring-gold/60">
        <div aria-hidden className="absolute inset-x-0 top-[9%] h-[11%] bg-gradient-to-r from-blue via-red to-gold opacity-80" />
        <div className="relative flex h-full flex-col justify-between p-[5.5%]">
          <p className="mt-[16%] font-mono text-[2.8cqw] uppercase tracking-[0.2em] text-gold">PB Phone Passport · show this card at the counter</p>
          <div className="self-start rounded-[2cqw] bg-white p-[2.5cqw]">
            <svg ref={svg} className="block h-[16cqw] w-auto" aria-label={`Barcode ${number}`} />
          </div>
          <div className="flex items-end justify-between gap-3 text-[2.6cqw] text-white/70">
            <span>{phone} · member since {since}</span>
            <span className="font-mono">pbmobiles.pk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
