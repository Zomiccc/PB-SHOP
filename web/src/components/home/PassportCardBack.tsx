"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import JsBarcode from "jsbarcode";
import { BRAND } from "@/lib/constants";

/**
 * Back of the PB Rewards card, following the client's reference (change request V2 §5): dark field, gold border,
 * red / blue / gold curves on the right, PB Mobiles logo, "SHOW THIS CARD AT THE COUNTER", a white barcode panel
 * with the customer's unique ID (PBM-0001…, inserted per customer — never baked into the artwork), and the
 * bottom line. The same back is used on screen and on the printed card; it never shows points.
 */
export function PassportCardBack({ number = "PBM-0000", className = "" }: { number?: string; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    // Bars only (the ID is printed as text below), stretched to fill the panel like the reference. Code 128
    // reads by relative bar widths, so scaling the whole barcode keeps it scannable.
    JsBarcode(el, number, { format: "CODE128", height: 100, width: 3, margin: 0, displayValue: false, background: "#ffffff", lineColor: "#000000" });
    const w = el.getAttribute("width");
    const h = el.getAttribute("height");
    if (w && h) {
      el.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      el.removeAttribute("width");
      el.removeAttribute("height");
    }
  }, [number]);

  return (
    <div className={`print-exact @container relative aspect-[1.586] w-full overflow-hidden rounded-[4.5cqw] bg-[#05070b] text-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.9),0_0_40px_-12px_rgba(217,166,46,.55)] ${className}`}>
      <CardBackArt />
      <Image src="/brand/pb-logo-2026-horizontal.webp" alt="PB Mobiles & Repairing Lab" width={1014} height={220} className="absolute left-[5.5%] top-[8%] h-auto w-[54%] drop-shadow-[0_2px_6px_rgba(0,0,0,.7)]" />
      <p className="absolute left-[5.5%] top-[35%] w-[64%] whitespace-nowrap text-center text-[3.5cqw] font-bold uppercase tracking-[0.12em] text-gold">Show this card at the counter</p>
      <div className="absolute left-[5.5%] top-[47%] flex h-[29%] w-[64%] flex-col items-center rounded-[2.2cqw] bg-white px-[5%] pb-[1.2cqw] pt-[2cqw] shadow-[0_0_0_0.35cqw_rgba(217,166,46,.9)]">
        <svg ref={svg} className="block min-h-0 w-full flex-1" preserveAspectRatio="none" role="img" aria-label={`Barcode ${number}`} />
        <p className="mt-[0.6cqw] font-sans text-[3.6cqw] font-bold leading-none tracking-[0.04em] text-black">{number}</p>
      </div>
      <div className="absolute bottom-[7%] left-[5.5%] flex w-[64%] items-center gap-[3cqw] text-[2.75cqw] leading-snug text-white/90">
        <p className="flex-1">Earn points on Devices, Repairs and accessories</p>
        <span aria-hidden className="h-[6cqw] w-[0.3cqw] shrink-0 bg-gold" />
        <p className="shrink-0 text-[3cqw]">{BRAND.cardWebsite}</p>
      </div>
    </div>
  );
}

/** Vector artwork for the card back: dark field, gold border, curved red / blue / gold bands on the right. */
function CardBackArt() {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden viewBox="0 0 1586 1000" className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id={`${id}-bg`} cx="30%" cy="40%" r="90%">
          <stop offset="0" stopColor="#10141c" />
          <stop offset="1" stopColor="#030406" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0b0" />
          <stop offset="0.3" stopColor="#d9a62e" />
          <stop offset="0.55" stopColor="#fbe08c" />
          <stop offset="0.8" stopColor="#a8771a" />
          <stop offset="1" stopColor="#f3cf6c" />
        </linearGradient>
        <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4045" />
          <stop offset="0.5" stopColor="#c8121a" />
          <stop offset="1" stopColor="#6d070b" />
        </linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4aa3ff" />
          <stop offset="0.5" stopColor="#1463e6" />
          <stop offset="1" stopColor="#082a7a" />
        </linearGradient>
      </defs>
      <rect width="1586" height="1000" fill={`url(#${id}-bg)`} />

      {/* Curved bands sweeping down the right side */}
      <path d="M1090 0 C1230 230 1140 480 1270 710 C1340 830 1450 930 1586 1000 V0 Z" fill={`url(#${id}-blue)`} />
      <path d="M1180 0 C1320 240 1230 480 1350 700 C1410 805 1490 890 1586 945 V0 Z" fill={`url(#${id}-red)`} />
      <path d="M1300 0 C1430 230 1350 460 1450 660 C1495 740 1540 790 1586 820 V0 Z" fill={`url(#${id}-blue)`} opacity="0.92" />
      <path d="M1410 0 C1520 210 1470 420 1545 590 L1586 640 V0 Z" fill={`url(#${id}-red)`} />
      <g fill="none" stroke={`url(#${id}-gold)`} strokeWidth="7">
        <path d="M1090 0 C1230 230 1140 480 1270 710 C1340 830 1450 930 1586 1000" />
        <path d="M1180 0 C1320 240 1230 480 1350 700 C1410 805 1490 890 1586 945" />
        <path d="M1300 0 C1430 230 1350 460 1450 660 C1495 740 1540 790 1586 820" />
        <path d="M1410 0 C1520 210 1470 420 1545 590 L1586 640" />
      </g>
      <path d="M1130 0 C1270 235 1180 480 1305 705" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" />

      {/* Gold border */}
      <rect x="16" y="16" width="1554" height="968" rx="58" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="10" />
    </svg>
  );
}
