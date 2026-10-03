import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { Logo } from "./Logo";
import { StoreLink, T } from "../site/Editable";

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
      { href: "/account", label: "My PB Rewards" },
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
          <p className="mt-4 font-semibold"><T k="footer.tagline" d="Phones. Repairs. Sorted." /></p>
          <address className="mt-4 space-y-1 text-sm not-italic text-white/60">
            <p><T k="store.address" d={BRAND.address} multiline /></p>
            <p>
              <StoreLink type="tel" k="store.phone" d={BRAND.phone} className="hover:text-white"><T k="store.phone" d={BRAND.phone} /></StoreLink> ·{" "}
              <StoreLink type="mailto" k="store.email" d={BRAND.email} className="hover:text-white"><T k="store.email" d={BRAND.email} /></StoreLink>
            </p>
            <p><T k="store.hours" d={BRAND.hours.map((h) => `${h.days} · ${h.time}`).join("\n")} multiline /></p>
          </address>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:col-span-8">
          {COLUMNS.map((c, ci) => (
            <div key={c.title}>
              <h3 className="text-sm font-semibold text-gold"><T k={`footer.col${ci + 1}`} d={c.title} /></h3>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {c.links.map((l, li) => (
                  <li key={l.label}><Link href={l.href} className="hover:text-white"><T k={`footer.col${ci + 1}.link${li + 1}`} d={l.label} /></Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-pb flex flex-col gap-4 py-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} <T k="footer.copyright" d={`${BRAND.full}. All rights reserved.`} /></p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/terms" className="hover:text-white"><T k="footer.terms" d="Terms & Conditions" /></Link>
            <Link href="/privacy" className="hover:text-white"><T k="footer.privacy" d="Privacy Policy" /></Link>
            <Link href="/returns" className="hover:text-white"><T k="footer.returns" d="Returns & Warranty" /></Link>
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
