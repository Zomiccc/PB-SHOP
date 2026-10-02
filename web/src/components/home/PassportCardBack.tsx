"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Back of the PB Rewards card: the unique Passport ID as a scannable Code 128 barcode. */
export function PassportCardBack({ number = "PBP-000000", phone, since, className = "" }: { number?: string; phone?: string; since?: string; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svg.current) JsBarcode(svg.current, number, { format: "CODE128", height: 38, width: 1.6, fontSize: 12, margin: 0, displayValue: true, background: "#ffffff", lineColor: "#000000" });
  }, [number]);

  return (
    <div className={`print-exact @container relative aspect-[1.586] w-full overflow-hidden rounded-[4.5cqw] bg-[#05070b] text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.9),0_0_0_1px_rgba(217,166,46,.7),0_0_40px_-10px_rgba(217,166,46,.55)] ${className}`}>
      <div aria-hidden className="absolute inset-x-0 top-[9%] h-[11%] bg-gradient-to-r from-blue via-red to-gold opacity-80" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_100%,rgba(0,119,217,.22),transparent_70%)]" />
      <div className="relative flex h-full flex-col justify-between p-[5.5%]">
        <p className="mt-[16%] font-mono text-[2.8cqw] uppercase tracking-[0.2em] text-gold">PB Rewards · show this card at the counter</p>
        <div className="self-start rounded-[2cqw] bg-white p-[2.5cqw]">
          <svg ref={svg} className="block h-[16cqw] w-auto" aria-label={`Barcode ${number}`} />
        </div>
        <div className="flex items-end justify-between gap-3 text-[2.6cqw] text-white/70">
          <span>{[phone, since && `member since ${since}`].filter(Boolean).join(" · ") || "Earn points on repairs & phones"}</span>
          <span className="font-mono">pbmobiles.pk</span>
        </div>
      </div>
    </div>
  );
}
