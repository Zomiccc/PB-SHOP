import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * PB Mobiles logo (cut out of the client-supplied artwork; transparent background for the dark theme).
 * `variant="stacked"` shows the full stacked logo (footer / hero); default is the horizontal header lockup.
 * Replace /public/brand/pb-logo*.webp with the client's vector logo when supplied.
 */
export function Logo({ className, variant = "horizontal" }: { dark?: boolean; className?: string; variant?: "horizontal" | "stacked" }) {
  const stacked = variant === "stacked";
  return (
    <Link href="/" aria-label="PB Mobiles & Repairing Lab — home" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src={stacked ? "/brand/pb-logo.webp" : "/brand/pb-logo-horizontal.webp"}
        alt="PB Mobiles & Repairing Lab"
        width={stacked ? 720 : 1007}
        height={stacked ? 469 : 200}
        priority={!stacked}
        className={stacked ? "h-auto w-44" : "h-9 w-auto sm:h-10"}
      />
    </Link>
  );
}
