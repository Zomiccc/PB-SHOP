import Link from "next/link";
import { BRAND, NAV } from "@/lib/constants";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white">
      <div className="gold-rule" />
      <div className="container-pb grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo dark />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
            Phones, repairs and accessories. Made simple. New and quality-checked used devices, backed by our in-house repair lab.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {BRAND.socials.map((s) => (
              <a key={s.label} href={s.href} className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white/70 transition hover:border-gold hover:text-gold">
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h3 className="label !opacity-50">Shop</h3>
          <ul className="space-y-2.5 text-sm text-white/75">
            {NAV.slice(1, 5).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-white">{n.label}</Link>
              </li>
            ))}
            <li><Link href="/installments" className="hover:text-white">Installments calculator</Link></li>
            <li><Link href="/loyalty" className="hover:text-white">PB Phone Passport</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="label !opacity-50">Company</h3>
          <ul className="space-y-2.5 text-sm text-white/75">
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/account" className="hover:text-white">My account</Link></li>
            <li><Link href="/repair/track" className="hover:text-white">Track a repair</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h3 className="label !opacity-50">Visit the lab</h3>
          <address className="space-y-2 text-sm not-italic text-white/75">
            <p>{BRAND.address}</p>
            <p>
              <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="hover:text-white">{BRAND.phone}</a>
              {" · "}
              <a href={`mailto:${BRAND.email}`} className="hover:text-white">{BRAND.email}</a>
            </p>
            {BRAND.hours.map((h) => (
              <p key={h.days} className="text-white/55">
                {h.days}: {h.time}
              </p>
            ))}
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-pb flex flex-col gap-3 py-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.full}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/returns" className="hover:text-white">Returns &amp; Warranty</Link>
          </nav>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="display translate-y-[18%] whitespace-nowrap text-center text-[22vw] leading-none text-white/[0.035]">PB MOBILES</p>
      </div>
    </footer>
  );
}
