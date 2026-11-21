import Link from "next/link";
import { cn } from "@/lib/format";

/** Two tabs on a Desk page: the new-entry form and its records list (so Manage doesn't repeat them). */
export function DeskTabs({ tabs, active }: { tabs: { href: string; label: string }[]; active: number }) {
  return (
    <div className="mb-5 inline-flex rounded-xl bg-white/5 p-1 text-sm" role="tablist">
      {tabs.map((t, i) => (
        <Link key={t.href} href={t.href as never} role="tab" aria-selected={i === active} className={cn("rounded-lg px-4 py-2 font-semibold", i === active ? "bg-gold text-navy-950" : "text-white/70 hover:text-white")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
