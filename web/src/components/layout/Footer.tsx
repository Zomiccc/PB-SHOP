import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/new-phones", label: "New phones" },
      { href: "/used-phones", label: "Pre-owned" },
      { href: "/tablets", label: "Tablets" },
      { href: "/accessories", label: "Accessories" },
      { href: "/installments", label: "Installments" },
    ],
  },
  {
    title: "Repairs",
    links: [
      { href: "/repair", label: "Book a repair" },
      { href: "/repair#form", label: "Repair types" },
      { href: "/repair/track", label: "Track a repair" },
    ],
  },
  {
    title: "Rewards",
    links: [
      { href: "/loyalty", label: "PB Rewards" },
      { href: "/loyalty#rules", label: "How it works" },
      { href: "/account", label: "My Passport" },
    ],
  },
  {
    title: "Contact",
    links: [
      { href: "/contact", label: "Get in touch" },
      { href: "/contact", label: "Our location" },
      { href: "/about", label: "About us" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-gold/20 bg-black text-white">
      <div className="container-pb grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo variant="stacked" />
          <p className="mt-4 font-semibold">Phones. Repairs. Sorted.</p>
          <address className="mt-4 space-y-1 text-sm not-italic text-white/60">
            <p>{BRAND.address}</p>
            <p>
              <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="hover:text-white">{BRAND.phone}</a> ·{" "}
              <a href={`mailto:${BRAND.email}`} className="hover:text-white">{BRAND.email}</a>
            </p>
            {BRAND.hours.map((h) => (
              <p key={h.days}>{h.days}: {h.time}</p>
            ))}
          </address>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-8">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h3 className="text-sm font-semibold text-gold">{c.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {c.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-pb flex flex-col gap-4 py-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.full}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/returns" className="hover:text-white">Returns &amp; Warranty</Link>
          </nav>
          <div className="flex gap-2">
            {BRAND.socials.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} className="rounded-full border border-white/15 px-3 py-1.5 text-white/70 transition hover:border-gold hover:text-gold">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
