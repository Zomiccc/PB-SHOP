import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { REPAIR_STATUSES } from "@/lib/constants";
import { AuthForms, LogoutButton } from "@/components/account/AuthForms";
import { FlipPassportCard } from "@/components/home/FlipPassportCard";
import { PassportCardPrint } from "@/components/admin/PassportCardPrint";
import { PrintButton } from "@/components/admin/PrintButton";
import { Icon } from "@/components/ui/Icon";
import { availablePoints } from "@/lib/loyalty";
import { getSetting } from "@/lib/settings";
import { formatCardExpiry } from "@/lib/passport-rules";

export const metadata: Metadata = { title: "My Account & PB Phone Passport", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <div className="container-pb grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="eyebrow text-red">PB Phone Passport</p>
          <h1 className="display mt-5 text-5xl md:text-7xl">Your phone, looked after.</h1>
          <p className="mt-5 max-w-md text-lg text-muted">Log in to see your points, what&apos;s expiring, your rewards, orders and repair history — all in one place.</p>
          <div className="mt-10 hidden lg:block">
            <FlipPassportCard />
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <AuthForms />
        </div>
      </div>
    );
  }

  // Expire anything that's due before showing the balance (expired points can't be redeemed).
  const points = await availablePoints(db, customer.id);
  const now = new Date();
  const [orders, repairs, history, lots, rewards, card, rules, welcomed] = await Promise.all([
    db.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10, include: { items: true } }),
    db.repairRequest.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.loyaltyTransaction.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 40, include: { reward: true } }),
    db.loyaltyTransaction.findMany({ where: { customerId: customer.id, remaining: { gt: 0 }, expiresAt: { gt: now } }, orderBy: { expiresAt: "asc" } }),
    db.reward.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }] }),
    getSetting("passportCard"),
    getSetting("passport"),
    db.loyaltyTransaction.count({ where: { customerId: customer.id, source: "WELCOME" } }),
  ]);
  const welcomePending = rules.welcomePoints > 0 && !!customer.passportJoinedAt && welcomed === 0;
  // Digital card only, and only when the owner shows it; the printed card never has the expiry.
  const expires = card.showExpiryOnDigital && customer.cardExpiresAt ? formatCardExpiry(customer.cardExpiresAt) : null;
  const earned = history.filter((t) => t.points > 0);
  const used = history.filter((t) => t.points < 0);
  const soon = lots.filter((l) => l.expiresAt && l.expiresAt.getTime() - now.getTime() < 30 * 86_400_000);
  const date = (d: Date) => d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  const statusLabel = (k: string) => REPAIR_STATUSES.find((s) => s.key === k)?.label ?? k;

  return (
    <>
      <section className="-mt-[var(--header-h)] bg-navy-950 pb-16 pt-[calc(var(--header-h)+3rem)] text-white">
        <div className="container-pb grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold">Welcome back</p>
            <h1 className="display mt-4 text-5xl md:text-7xl">{customer.name.split(" ")[0]}.</h1>
            <div className="mt-8 flex gap-8">
              <div>
                <p className="display text-5xl text-gold">{points}</p>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">Points</p>
              </div>
              <div>
                <p className="display text-5xl">{orders.length}</p>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">Orders</p>
              </div>
              <div>
                <p className="display text-5xl">{repairs.length}</p>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/50">Repairs</p>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <Link href="/repair" className="btn btn-gold !py-2.5 !text-sm">Book a repair</Link>
              <LogoutButton />
            </div>
          </div>
          <div>
            <FlipPassportCard name={customer.name} number={customer.passportNo} points={points} phone={customer.phone} since={customer.createdAt.toLocaleDateString("en-PK", { month: "short", year: "numeric" })} expires={expires} />
            <div className="mt-3 flex justify-center print:hidden"><PrintButton label="Print / save my card" /></div>
            <PassportCardPrint name={customer.name} number={customer.passportNo} points={points} phone={customer.phone} since={customer.createdAt.toLocaleDateString("en-PK", { month: "short", year: "numeric" })} />
          </div>
        </div>
      </section>

      <div className="container-pb grid gap-8 py-16 lg:grid-cols-2">
        {/* Points & expiry */}
        <Block title="Your points" icon="star">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-navy-950 p-4"><p className="display text-4xl text-gold">{points}</p><p className="text-xs text-muted">available now</p></div>
            <div className="rounded-2xl bg-navy-950 p-4"><p className="display text-4xl">{soon.reduce((s, l) => s + (l.remaining ?? 0), 0)}</p><p className="text-xs text-muted">expiring in 30 days</p></div>
          </div>
          {welcomePending && (
            <p className="rounded-xl bg-blue/10 p-4 text-sm ring-1 ring-blue/30">
              <b className="text-blue-soft">Welcome reward waiting:</b> your {rules.welcomePoints} welcome points are added with your first purchase or repair.
            </p>
          )}
          {rules.referralPoints > 0 && (
            <p className="rounded-xl bg-gold/10 p-4 text-sm ring-1 ring-gold/30">
              <b className="text-gold">Refer a friend:</b> share your Passport ID <b className="font-mono">{customer.passportNo}</b>. You get {rules.referralPoints} points when they join with it and make their first purchase or repair.
            </p>
          )}
          {lots.length === 0 ? (
            <Empty text="Points you earn appear here with their expiry dates." />
          ) : (
            <ul className="divide-y divide-ink/10 text-sm">
              {lots.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate">{l.reason ?? "Points"}</span>
                    <span className="text-xs text-muted">Earned {date(l.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <b className="text-gold">{l.remaining} pts</b>
                    <span className={`block text-xs ${soon.includes(l) ? "text-red" : "text-muted"}`}>expires {l.expiresAt ? date(l.expiresAt) : "—"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Rewards */}
        <Block title="Rewards" icon="gift">
          <ul className="divide-y divide-ink/10">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {r.name}
                  {r.exclusions && <span className="block text-xs text-muted">{r.exclusions}</span>}
                </span>
                <span className={`shrink-0 ${points >= r.pointsCost ? "font-semibold text-emerald-400" : "text-muted"}`}>{points >= r.pointsCost ? "Ready · " : ""}{r.pointsCost} pts</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Redeem in store — staff will apply the reward to your Passport.</p>
        </Block>

        {/* Orders */}
        <Block title="Orders" icon="bag">
          {orders.length === 0 ? (
            <Empty text="No orders yet." />
          ) : (
            <ul className="divide-y divide-ink/10">
              {orders.map((o) => (
                <li key={o.id} className="py-3 text-sm">
                  <div className="flex justify-between">
                    <b>{o.number}</b>
                    <span>{pkr(o.total)}</span>
                  </div>
                  <p className="truncate text-muted">{o.items.map((i) => i.name).join(", ")}</p>
                  <p className="text-xs text-muted">
                    {o.createdAt.toLocaleDateString("en-PK")} · {o.paymentStatus.toLowerCase()} · {o.fulfilmentStatus.toLowerCase().replace("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Repairs */}
        <Block title="Repair history" icon="wrench">
          {repairs.length === 0 ? (
            <Empty text="No repairs yet." />
          ) : (
            <ul className="divide-y divide-ink/10">
              {repairs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <b>{r.ref}</b> <span className="text-muted">· {r.brand} {r.model}</span>
                    <p className="text-xs text-muted">{r.createdAt.toLocaleDateString("en-PK")}</p>
                  </div>
                  <Link href={`/repair/track?ref=${r.ref}`} className="rounded-full bg-cream px-3 py-1 text-xs font-medium hover:bg-cream-200">{statusLabel(r.status)}</Link>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Earning history */}
        <Block title="Earning history" icon="sparkle">
          {earned.length === 0 ? (
            <Empty text="Points appear here after repairs and phone purchases." />
          ) : (
            <ul className="divide-y divide-ink/10">
              {earned.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span>
                    {t.reason ?? t.type}
                    <span className="block text-xs text-muted">{date(t.createdAt)}{t.expiresAt && ` · expires ${date(t.expiresAt)}`}</span>
                  </span>
                  <b className="shrink-0 text-emerald-400">+{t.points}</b>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Redemptions & expiry */}
        <Block title="Redemptions & expired points" icon="gift">
          {used.length === 0 ? (
            <Empty text="Rewards you redeem (and any expired points) are listed here." />
          ) : (
            <ul className="divide-y divide-ink/10">
              {used.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-3 text-sm">
                  <span>
                    {t.type === "REDEEM" ? t.reward?.name ?? t.reason : t.reason ?? t.type}
                    <span className="block text-xs text-muted">{date(t.createdAt)} · {t.type === "REDEEM" ? "redeemed" : t.type === "EXPIRE" ? "expired" : "adjustment"}</span>
                  </span>
                  <b className="shrink-0 text-red">{t.points}</b>
                </li>
              ))}
            </ul>
          )}
        </Block>
      </div>
    </>
  );
}

function Block({ title, icon, className, children }: { title: string; icon: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`card p-6 md:p-8 ${className ?? ""}`}>
      <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold">
        <Icon name={icon} className="h-5 w-5 text-gold" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-cream p-4 text-sm text-muted">{text}</p>;
}
