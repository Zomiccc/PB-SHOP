import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * Typographic lockup derived from the supplied PB logo (blue P, red B, gold MOBILES).
 * Swap for the client's vector logo file once supplied — see REQUIREMENTS.md.
 */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="PB Mobiles & Repairing Lab — home" className={cn("group flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative grid h-10 w-10 place-items-center rounded-[10px] bg-navy-950 ring-1 ring-gold/60 transition-transform duration-500 group-hover:rotate-[-6deg]"
      >
        <span className="display text-[1.15rem] italic leading-none tracking-[-0.08em]">
          <span className="text-blue">P</span>
          <span className="text-red">B</span>
        </span>
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-gold" />
      </span>
      <span className="flex flex-col whitespace-nowrap leading-none">
        <span className={cn("display text-[1.05rem] tracking-[-0.03em]", dark ? "text-white" : "text-navy-950")}>
          PB <span className={dark ? "text-gold" : "text-navy-950"}>MOBILES</span>
        </span>
        <span className={cn("mt-1 font-mono text-[0.55rem] uppercase tracking-[0.28em]", dark ? "text-white/55" : "text-muted")}>
          &amp; Repairing Lab
        </span>
      </span>
    </Link>
  );
}
