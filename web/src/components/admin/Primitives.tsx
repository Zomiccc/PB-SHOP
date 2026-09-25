import Link from "next/link";
import { cn } from "@/lib/format";

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-3xl md:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] md:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-600/10 text-emerald-700",
  red: "bg-red/10 text-red",
  gold: "bg-gold/20 text-[#7a570c]",
  blue: "bg-blue/10 text-blue",
  gray: "bg-ink/5 text-muted",
  navy: "bg-navy-950 text-white",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES | string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone] ?? TONES.gray)}>{children}</span>;
}

export function statusTone(s: string) {
  if (["PAID", "SUCCESS", "COMPLETED", "READY", "APPROVED", "ACTIVE", "RECEIVED"].includes(s)) return "green";
  if (["FAILED", "CANCELLED", "RETURNED", "EXHAUSTED", "VOID", "LOGIN_FAILED"].includes(s)) return "red";
  if (["PENDING", "AWAITING", "ON_HOLD", "NEEDS_REVIEW", "PROCESSING", "DIAGNOSING", "REPAIRING"].includes(s)) return "gold";
  if (["NEW", "SHIPPED"].includes(s)) return "blue";
  return "gray";
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "red" | "gold" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={cn("display mt-2 text-3xl", tone === "red" ? "text-red" : tone === "gold" ? "text-[#a87a14]" : "text-navy-950")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <div className="-mx-5 overflow-x-auto md:-mx-6">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink/10 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            {head.map((h, i) => (
              <th key={i} className="px-5 py-2.5 font-medium md:px-6">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {rows.length ? children : (
            <tr>
              <td colSpan={head.length} className="px-6 py-10 text-center text-muted">{empty ?? "Nothing here yet."}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => <td className={cn("px-5 py-3 align-middle md:px-6", className)}>{children}</td>;

export function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("rounded-full px-3 py-1.5 text-sm transition", active ? "bg-navy-950 text-white" : "bg-white text-muted shadow-[var(--shadow-card)] hover:text-ink")}>
      {children}
    </Link>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const dt = (d: Date) => d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
