import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * PB Mobiles logo — the client-supplied 2026 logo, cut out of its photo onto a transparent background for the
 * dark theme (change request §2).
 * `variant="stacked"` shows the full stacked logo (footer / hero); default is the horizontal header lockup.
 */
export function Logo({ className, variant = "horizontal" }: { dark?: boolean; className?: string; variant?: "horizontal" | "stacked" }) {
  const stacked = variant === "stacked";
  return (
    <Link href="/" aria-label="PB Mobiles & Repairing Lab — home" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={stacked ? "/brand/pb-logo-2026.webp" : "/brand/pb-logo-2026-horizontal.webp"}
        alt="PB Mobiles & Repairing Lab"
        width={stacked ? 976 : 1014}
        height={stacked ? 683 : 220}
        priority={!stacked}
        className={stacked ? "h-auto w-44" : "h-9 w-auto sm:h-10"}
      />
    </Link>
  );
}
