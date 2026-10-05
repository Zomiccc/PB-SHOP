import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { Logo } from "./Logo";
import { StoreLink, T } from "../site/Editable";
import { Icon } from "../ui/Icon";
import { SocialIcon } from "../ui/SocialIcon";

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
          {/* One detail per line, each with its icon (client request). */}
          <address className="mt-5 space-y-3 text-sm not-italic text-white/70">
            <p className="flex items-start gap-3">
              <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span><T k="store.address" d={BRAND.address} multiline /></span>
            </p>
            <p className="flex items-center gap-3">
              <Icon name="call" className="h-4 w-4 shrink-0 text-gold" />
              <StoreLink type="tel" k="store.phone" d={BRAND.phone} className="hover:text-white"><T k="store.phone" d={BRAND.phone} /></StoreLink>
            </p>
            <p className="flex items-center gap-3">
              <Icon name="mail" className="h-4 w-4 shrink-0 text-gold" />
              <StoreLink type="mailto" k="store.email" d={BRAND.email} className="break-all hover:text-white"><T k="store.email" d={BRAND.email} /></StoreLink>
            </p>
            <p className="flex items-start gap-3">
              <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span><T k="store.hours" d={BRAND.hours.map((h) => `${h.days} · ${h.time}`).join("\n")} multiline /></span>
            </p>
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
        <div className="container-pb flex flex-col gap-4 pb-24 pt-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between md:pb-6">
          <p>© {new Date().getFullYear()} <T k="footer.copyright" d={`${BRAND.full}. All rights reserved.`} /></p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/terms" className="hover:text-white"><T k="footer.terms" d="Terms & Conditions" /></Link>
            <Link href="/privacy" className="hover:text-white"><T k="footer.privacy" d="Privacy Policy" /></Link>
            <Link href="/returns" className="hover:text-white"><T k="footer.returns" d="Returns & Warranty" /></Link>
          </nav>
          <div className="flex flex-wrap gap-2">
            {BRAND.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`PB Mobiles on ${s.label}`} title={s.label} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-gold hover:text-gold">
                <SocialIcon name={s.label} className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
