import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { REPAIR_STATUSES } from "@/lib/constants";
import { AuthForms, LogoutButton } from "@/components/account/AuthForms";
import { PassportCard } from "@/components/home/PassportCard";
import { Icon } from "@/components/ui/Icon";

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
          <p className="mt-5 max-w-md text-lg text-muted">Log in to see your points, orders, repair history and Care Card visits — all in one place.</p>
          <div className="mt-10 hidden lg:block">
            <PassportCard />
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <AuthForms />
        </div>
      </div>
    );
  }

  const [orders, repairs, loyalty, cards, rewards, services] = await Promise.all([
    db.order.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10, include: { items: true } }),
    db.repairRequest.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.loyaltyTransaction.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.careCard.findMany({ where: { customerId: customer.id }, include: { redemptions: { include: { service: true } } }, orderBy: { issuedAt: "desc" } }),
    db.reward.findMany({ where: { active: true }, orderBy: { pointsCost: "asc" } }),
    db.careCardService.findMany({ orderBy: { visitNumber: "asc" } }),
  ]);
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
                <p className="display text-5xl text-gold">{customer.loyaltyPoints}</p>
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
          <PassportCard name={customer.name} number={customer.passportNo} points={customer.loyaltyPoints} />
        </div>
      </section>

      <div className="container-pb grid gap-8 py-16 lg:grid-cols-2">
        {/* Care Cards */}
        <Block title="PB Care Cards" icon="shield">
          {cards.length === 0 ? (
            <Empty text="Care Cards are issued with eligible phone purchases." />
          ) : (
            cards.map((c) => {
              const used = c.redemptions.length;
              return (
                <div key={c.id} className="rounded-2xl bg-navy-950 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm text-gold">{c.number}</p>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{c.status === "EXHAUSTED" ? "Fully used" : `${c.maxUses - used} of ${c.maxUses} uses left`}</span>
                  </div>
                  <ol className="mt-4 space-y-2">
                    {services.map((s) => {
                      const r = c.redemptions.find((x) => x.serviceId === s.id);
                      return (
                        <li key={s.id} className="flex items-center gap-3 text-sm">
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[0.65rem] ${r ? "bg-gold text-navy-950" : "border border-white/25"}`}>
                            {r ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /> : s.visitNumber}
                          </span>
                          <span className={r ? "text-white/50 line-through" : s.configured ? "" : "text-white/40"}>{s.configured ? s.name : "Fifth visit benefit — to be announced"}</span>
                          {r && <span className="ml-auto text-xs text-white/40">{r.createdAt.toLocaleDateString("en-PK")}</span>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })
          )}
        </Block>

        {/* Rewards */}
        <Block title="Rewards" icon="gift">
          <ul className="divide-y divide-ink/10">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span>{r.name}</span>
                <span className={customer.loyaltyPoints >= r.pointsCost ? "font-semibold text-emerald-700" : "text-muted"}>{r.pointsCost} pts</span>
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

        {/* Points */}
        <Block title="Points activity" icon="star" className="lg:col-span-2">
          {loyalty.length === 0 ? (
            <Empty text="Points appear here after eligible purchases and repairs." />
          ) : (
            <ul className="divide-y divide-ink/10">
              {loyalty.map((t) => (
                <li key={t.id} className="flex justify-between py-3 text-sm">
                  <span>
                    {t.reason ?? t.type}
                    <span className="block text-xs text-muted">
                      {t.createdAt.toLocaleDateString("en-PK")}
                      {t.expiresAt && ` · expires ${t.expiresAt.toLocaleDateString("en-PK")}`}
                    </span>
                  </span>
                  <b className={t.points >= 0 ? "text-emerald-700" : "text-red"}>{t.points > 0 ? `+${t.points}` : t.points}</b>
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
