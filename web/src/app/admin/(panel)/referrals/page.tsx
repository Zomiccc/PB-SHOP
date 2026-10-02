import Link from "next/link";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { getSetting } from "@/lib/settings";
import { Badge, PageTitle, Panel, Table, Td, dt } from "@/components/admin/Primitives";

export const metadata = { title: "Referrals" };

/**
 * Referral relationships (Passport requirements v4 §5–§6): which account referred each new account, and
 * whether the referring account has been rewarded (on the referred account's first eligible transaction).
 */
export default async function ReferralsPage(props: PageProps<"/admin/referrals">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = sp.status === "pending" || sp.status === "rewarded" ? sp.status : "";
  const who = q ? { OR: [{ name: like(q) }, { passportNo: { contains: q.toUpperCase() } }, { legacyNo: { contains: q.toUpperCase() } }, { phone: { contains: q.replace(/\D/g, "") || q } }] } : null;
  const [rows, totals, rules] = await Promise.all([
    db.customer.findMany({
      where: {
        referredById: { not: null },
        ...(status === "pending" ? { referralRewardedAt: null } : status === "rewarded" ? { referralRewardedAt: { not: null } } : {}),
        ...(who ? { OR: [who, { referredBy: who }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { referredBy: { select: { id: true, name: true, passportNo: true } } },
    }),
    db.customer.groupBy({ by: ["referredById"], where: { referredById: { not: null } }, _count: { _all: true }, orderBy: { _count: { referredById: "desc" } }, take: 5 }),
    getSetting("passport"),
  ]);
  const top = await db.customer.findMany({ where: { id: { in: totals.map((t) => t.referredById!) } }, select: { id: true, name: true, passportNo: true } });

  return (
    <>
      <PageTitle title="Referrals" sub={`Every account's Rewards ID is its referral code. The referring account gets ${rules.referralPoints} points when the referred account makes its first purchase or repair.`}>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Name, phone, Rewards ID…" className="field !w-56 !rounded-full !py-2" />
          <select name="status" defaultValue={status} className="field !w-36 !rounded-full !py-2">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="rewarded">Rewarded</option>
          </select>
          <button className="btn btn-ghost !py-2 !text-sm text-ink"><span>Filter</span></button>
        </form>
      </PageTitle>

      {top.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {totals.map((t) => {
            const c = top.find((x) => x.id === t.referredById);
            return c ? (
              <Link key={c.id} href={`/admin/customers/${c.id}`} className="rounded-2xl bg-card px-4 py-3 text-sm shadow-[var(--shadow-card)] hover:ring-1 hover:ring-gold/50">
                <b>{c.name}</b> <span className="font-mono text-xs text-muted">{c.passportNo}</span>
                <span className="block text-xs text-gold">{t._count._all} referred</span>
              </Link>
            ) : null;
          })}
        </div>
      )}

      <Panel>
        <Table head={["Referred account", "Joined", "Referring account", "Referral reward"]} empty="No referrals yet.">
          {rows.map((c) => (
            <tr key={c.id}>
              <Td><Link href={`/admin/customers/${c.id}`} className="font-semibold hover:text-blue">{c.name}</Link><span className="block font-mono text-xs text-muted">{c.passportNo}</span></Td>
              <Td className="text-xs text-muted">{dt(c.createdAt)}</Td>
              <Td>{c.referredBy ? <Link href={`/admin/customers/${c.referredBy.id}`} className="font-semibold hover:text-blue">{c.referredBy.name}</Link> : "—"}<span className="block font-mono text-xs text-muted">{c.referredBy?.passportNo}</span></Td>
              <Td>{c.referralRewardedAt ? <><Badge tone="green">Rewarded</Badge><span className="block text-xs text-muted">{dt(c.referralRewardedAt)}</span></> : <><Badge tone="gold">Pending</Badge><span className="block text-xs text-muted">awaiting first purchase / repair</span></>}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
