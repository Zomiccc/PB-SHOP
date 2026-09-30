"use client";

import { PassportCard } from "../home/PassportCard";
import { PassportCardBack } from "../home/PassportCardBack";

/**
 * Print layout for the PB Rewards card: front + back at the standard bank-card size (85.6 × 54 mm),
 * one face per page. Hidden on screen (the 3D flip card is shown there instead).
 * The physical card never carries the expiry date (Passport requirements §1), so it takes no `expires`.
 */
export function PassportCardPrint({ name, number, points, phone, since }: { name: string; number: string; points: number; phone: string; since: string }) {
  return (
    <div className="print-area print-cards hidden print:flex print:flex-col">
      <style>{`@media print { @page { size: 85.6mm 54mm; margin: 0; } .print-card { width: 85.6mm !important; height: 54mm !important; break-after: page; } .print-card > * , .print-card [class*=rounded] { border-radius: 0 !important; box-shadow: none !important; } }`}</style>
      <div className="print-card"><PassportCard still name={name} number={number} points={points} /></div>
      <div className="print-card"><PassportCardBack number={number} phone={phone} since={since} /></div>
    </div>
  );
}
