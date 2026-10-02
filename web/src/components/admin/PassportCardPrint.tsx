"use client";

import { PassportCard } from "../home/PassportCard";
import { PassportCardBack } from "../home/PassportCardBack";

/**
 * Print / PDF layout for the PB Rewards card: front + back at the standard bank-card size (85.6 × 54 mm),
 * one face per page. Hidden on screen (the 3D flip card is shown there instead).
 * The physical card is a clean reusable card (change request V2 §4): it takes no points and no expiry, and
 * renders the front in its `print` state — only the name and the customer's unique ID are printed.
 */
export function PassportCardPrint({ name, number }: { name: string; number: string }) {
  return (
    <div className="print-area print-cards hidden print:flex print:flex-col">
      <style>{`@media print { @page { size: 85.6mm 54mm; margin: 0; } .print-card { width: 85.6mm !important; height: 54mm !important; break-after: page; } .print-card > * , .print-card [class*=rounded] { border-radius: 0 !important; box-shadow: none !important; } }`}</style>
      <div className="print-card"><PassportCard still mode="print" name={name} number={number} /></div>
      <div className="print-card"><PassportCardBack number={number} /></div>
    </div>
  );
}
