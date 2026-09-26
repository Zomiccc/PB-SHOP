import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { requireStaffPage } from "@/lib/staff";
import { Badge, FilterLink, PageTitle, Panel, Table, Td, dt, statusTone } from "@/components/admin/Primitives";

export const metadata = { title: "Audit log" };

const GROUPS: Record<string, { label: string; actions?: string[] }> = {
  all: { label: "Everything" },
  sales: { label: "Sales", actions: ["SALE_COMPLETED", "ORDER_MARKED_PAID", "ORDER_RETURNED", "ORDER_CANCELLED", "ORDER_STATUS_CHANGED", "SALE_NOTE_ADDED", "ZERO_STOCK_OVERRIDE", "ORDER_ON_HOLD_STOCK", "PAYMENT_CALLBACK_REJECTED"] },
  stock: { label: "Stock", actions: ["STOCK_ADJUSTED", "ZERO_STOCK_OVERRIDE"] },
  prices: { label: "Products & prices", actions: ["PRICE_CHANGED", "PRODUCT_UPDATED", "PRODUCT_CREATED", "VARIANT_CREATED", "VARIANT_UPDATED", "PRODUCT_ACTIVATED", "PRODUCT_DEACTIVATED", "MODEL_3D_APPROVED"] },
  repairs: { label: "Repairs", actions: ["REPAIR_STATUS_CHANGED", "REPAIR_NOTE_ADDED", "REPAIR_UPDATED", "REPAIR_CREATED"] },
  care: { label: "Care Card & loyalty", actions: ["CARE_CARD_REDEEMED", "CARE_SERVICE_CHANGED", "CARE_SERVICE_CREATED", "LOYALTY_ADJUSTED", "REWARD_REDEEMED", "REWARD_CREATED", "REWARD_UPDATED"] },
  admin: { label: "Settings & staff", actions: ["SETTING_CHANGED", "STAFF_CREATED", "STAFF_UPDATED", "STAFF_PASSWORD_RESET", "PASSWORD_CHANGED", "DATA_EXPORTED"] },
};

/**
 * Super-admin audit trail (§16): timestamp, user, action, affected record, before → after.
 * Also shows every login / logout / failed login.
 */
export default async function AuditPage(props: PageProps<"/admin/audit">) {
  await requireStaffPage({ superAdmin: true });
  const sp = await props.searchParams;
  const group = typeof sp.group === "string" && sp.group in GROUPS ? sp.group : "all";
  const who = typeof sp.staff === "string" ? sp.staff : "";
  const from = typeof sp.from === "string" && sp.from ? new Date(sp.from) : null;
  const to = typeof sp.to === "string" && sp.to ? new Date(`${sp.to}T23:59:59`) : null;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: Prisma.AuditLogWhereInput = {
    ...(GROUPS[group].actions ? { action: { in: GROUPS[group].actions } } : {}),
    ...(who ? { staffId: who } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? { OR: [{ recordLabel: like(q) }, { action: { contains: q.toUpperCase() } }] } : {}),
  };
  const [logs, staff, logins] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 300, include: { staff: true } }),
    db.staff.findMany({ orderBy: { name: "asc" } }),
    db.staffLoginEvent.findMany({ where: who ? { staffId: who } : {}, orderBy: { createdAt: "desc" }, take: 60, include: { staff: true } }),
  ]);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ group, staff: who, q, from: typeof sp.from === "string" ? sp.from : "", to: typeof sp.to === "string" ? sp.to : "", ...patch });
    [...p.keys()].forEach((k) => !p.get(k) && p.delete(k));
    return `/admin/audit?${p}`;
  };

  return (
    <>
      <PageTitle title="Audit log" sub="Who did what, when — with before and after values. Owner only.">
        <Link href="/api/admin/export?type=audit" className="btn btn-ghost !py-2 !text-sm text-ink"><span>Export CSV</span></Link>
      </PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(GROUPS).map(([k, v]) => <FilterLink key={k} href={qs({ group: k })} active={group === k}>{v.label}</FilterLink>)}
      </div>
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="group" value={group} />
        <label><span className="label">Employee</span>
          <select name="staff" defaultValue={who} className="field !py-2">
            <option value="">Everyone</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label><span className="label">From</span><input type="date" name="from" defaultValue={typeof sp.from === "string" ? sp.from : ""} className="field !py-2" /></label>
        <label><span className="label">To</span><input type="date" name="to" defaultValue={typeof sp.to === "string" ? sp.to : ""} className="field !py-2" /></label>
        <label><span className="label">Record / SKU / order / repair</span><input name="q" defaultValue={q} placeholder="PB-013, PBR-1042…" className="field !py-2" /></label>
        <button className="btn btn-primary !py-2.5 !text-sm">Filter</button>
      </form>

      <Panel>
        <Table head={["Time", "User", "Action", "Record", "Before → After"]} empty="No matching entries.">
          {logs.map((l) => (
            <tr key={l.id} className="align-top">
              <Td className="whitespace-nowrap text-xs text-muted">{dt(l.createdAt)}</Td>
              <Td className="whitespace-nowrap">{l.staff?.name ?? <span className="text-muted">System / online</span>}</Td>
              <Td><Badge tone={l.action.includes("OVERRIDE") || l.action.includes("REJECTED") ? "red" : l.action.includes("PRICE") ? "gold" : "blue"}>{l.action.replaceAll("_", " ")}</Badge></Td>
              <Td>{l.recordLabel ?? l.entityId}</Td>
              <Td className="max-w-md text-xs"><Diff before={l.before} after={l.after} /></Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="Logins & logouts" className="mt-6">
        <Table head={["Time", "User", "Event", "IP", "Device"]} empty="No login activity.">
          {logins.map((e) => (
            <tr key={e.id}>
              <Td className="text-xs text-muted">{dt(e.createdAt)}</Td>
              <Td>{e.staff.name}</Td>
              <Td><Badge tone={e.type === "LOGIN" ? "green" : statusTone(e.type)}>{e.type.replace("_", " ")}</Badge></Td>
              <Td className="font-mono text-xs">{e.ip ?? "—"}</Td>
              <Td className="max-w-[260px] truncate text-xs text-muted">{e.userAgent ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}

function Diff({ before, after }: { before: string | null; after: string | null }) {
  const b = safe(before);
  const a = safe(after);
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  if (!keys.length) return <span className="text-muted">—</span>;
  return (
    <ul className="space-y-0.5">
      {keys.slice(0, 8).map((k) => (
        <li key={k}>
          <b>{k}</b>: {k in b && <span className="text-red line-through">{fmt(b[k])}</span>} {k in b && k in a && "→"} {k in a && <span className="text-emerald-400">{fmt(a[k])}</span>}
        </li>
      ))}
    </ul>
  );
}
const safe = (s: string | null): Record<string, unknown> => {
  try {
    const v = s ? JSON.parse(s) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? v : { value: v };
  } catch {
    return {};
  }
};
const fmt = (v: unknown) => (typeof v === "object" ? JSON.stringify(v) : String(v)).slice(0, 80);
