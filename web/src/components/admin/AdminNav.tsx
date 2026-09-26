"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

type Item = { href: string; label: string; icon: string; badge?: number; superOnly?: boolean };

export function AdminNav({ role, name, counts, logout }: { role: string; name: string; counts: { lowStock: number; newRepairs: number; inbox: number; onHold: number; reviews: number }; logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isSuper = role === "SUPER_ADMIN";

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Desk",
      items: [
        { href: "/admin", label: "Dashboard", icon: "sparkle" },
        { href: "/admin/pos", label: "POS / Scan & sell", icon: "card" },
        { href: "/admin/care-cards", label: "Care Card desk", icon: "shield" },
      ],
    },
    {
      title: "Manage",
      items: [
        { href: "/admin/orders", label: "Orders", icon: "bag", badge: counts.onHold },
        { href: "/admin/repairs", label: "Repairs", icon: "wrench", badge: counts.newRepairs },
        { href: "/admin/products", label: "Products", icon: "phone" },
        { href: "/admin/inventory", label: "Inventory", icon: "filter", badge: counts.lowStock },
        { href: "/admin/customers", label: "Customers & loyalty", icon: "user" },
        { href: "/admin/inbox", label: "Inbox", icon: "chat", badge: counts.inbox },
        { href: "/admin/reviews", label: "Reviews", icon: "star", badge: counts.reviews },
        { href: "/admin/reports", label: "Reports", icon: "star" },
      ],
    },
    {
      title: "Owner",
      items: [
        { href: "/admin/audit", label: "Audit log", icon: "clock", superOnly: true },
        { href: "/admin/staff", label: "Staff accounts", icon: "user", superOnly: true },
        { href: "/admin/settings", label: "Settings & rules", icon: "gift", superOnly: true },
      ],
    },
  ];

  const nav = (
    <nav className="flex flex-col gap-6">
      {groups.map((g) => {
        const items = g.items.filter((i) => !i.superOnly || isSuper);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-2 px-3 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-white/35">{g.title}</p>
            <ul className="space-y-0.5">
              {items.map((i) => {
                const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => setOpen(false)}
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white")}
                    >
                      <Icon name={i.icon} className={cn("h-4 w-4", active ? "text-gold" : "")} />
                      <span className="flex-1">{i.label}</span>
                      {!!i.badge && <span className="rounded-full bg-red px-1.5 py-0.5 text-[0.65rem] font-bold text-white">{i.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-navy-950 px-4 py-3 text-white lg:hidden">
        <span className="display italic"><span className="text-blue">P</span><span className="text-red">B</span> <span className="not-italic text-gold">ADMIN</span></span>
        <button onClick={() => setOpen((o) => !o)} aria-label="Menu" className="grid h-9 w-9 place-items-center"><Icon name={open ? "close" : "menu"} /></button>
      </div>
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-950 p-4 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <Link href="/admin" className="mb-8 hidden px-3 pt-2 lg:block">
          <span className="display text-xl italic"><span className="text-blue">P</span><span className="text-red">B</span></span>{" "}
          <span className="display text-xl text-gold">MOBILES</span>
          <span className="block font-mono text-[0.55rem] uppercase tracking-[0.28em] text-white/40">Staff dashboard</span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-gold">{isSuper ? "Owner · super admin" : "Employee"}</p>
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/admin/password" className="rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20">Password</Link>
            <Link href="/" target="_blank" className="rounded-lg bg-white/10 px-2.5 py-1.5 hover:bg-white/20">View site</Link>
            <form action={logout}>
              <button className="rounded-lg bg-red px-2.5 py-1.5 font-semibold">Log out</button>
            </form>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
