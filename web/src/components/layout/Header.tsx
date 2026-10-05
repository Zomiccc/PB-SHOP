"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BRAND, NAV } from "@/lib/constants";
import { cartCount, useCart } from "@/store/cart";
import { cn } from "@/lib/format";
import { Logo } from "./Logo";
import { Icon } from "../ui/Icon";
import { StoreLink, T } from "../site/Editable";

/** Content key for a menu item, e.g. "/new-phones" → "nav.new-phones". */
const navKey = (href: string) => `nav.${href.replace(/^\//, "") || "home"}`;

/** Pages whose first screen is dark navy — header starts in its light-on-dark state. */
const DARK_TOP = ["/", "/loyalty", "/repair"];

export function Header() {
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const count = cartCount(items);
  // The mobile menu fills exactly the space below where it starts on screen — bars above the header (Enable
  // Notifications, the utility strip) push it down, so a fixed "100svh − header" would hide the last buttons.
  const navRef = useRef<HTMLElement>(null);
  const [menuMax, setMenuMax] = useState<number | null>(null);
  useEffect(() => {
    if (!menu) return;
    const fit = () => {
      // Measured from the header bar just above the menu (stable — the menu itself slides in).
      const bar = navRef.current?.previousElementSibling ?? navRef.current;
      const top = bar?.getBoundingClientRect().bottom ?? 0;
      setMenuMax(Math.max(200, window.innerHeight - Math.max(0, top)));
    };
    fit();
    const raf = requestAnimationFrame(fit);
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit);
    };
  }, [menu]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation (render-time state adjustment, no effect needed).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenu(false);
  }

  const dark = DARK_TOP.includes(pathname) && !scrolled && !menu;

  return (
    <>
      {/* Utility strip like the reference's top category bar */}
      <div className="relative z-50 hidden bg-navy-950 text-white/70 sm:block">
        <div className="container-pb flex h-9 items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.2em]">
          <div className="flex items-center gap-6">
            <Link href="/new-phones" className="hover:text-white">
              <span className="text-gold">★</span> <T k="strip.phones" d="Phones" />
            </Link>
            <Link href="/repair" className="hover:text-white"><T k="strip.repairs" d="Repairs" /></Link>
            <Link href="/accessories" className="hover:text-white"><T k="strip.accessories" d="Accessories" /></Link>
            <Link href="/installments" className="text-gold hover:text-gold-soft"><T k="strip.installments" d="Installments" /></Link>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden whitespace-nowrap xl:inline"><T k="strip.hours" d={`Open ${BRAND.hours.map((h) => h.time).join(" / ")}`} /></span>
            <StoreLink type="tel" k="store.phone" d={BRAND.phone} className="hidden whitespace-nowrap hover:text-white md:inline"><T k="store.phone" d={BRAND.phone} /></StoreLink>
            <span className="hidden whitespace-nowrap 2xl:inline"><T k="strip.payments" d="Secure JazzCash / wallet / bank payments" /></span>
            <Link href="/loyalty" className="text-gold hover:text-gold-soft"><T k="strip.rewards" d="PB Rewards →" /></Link>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,box-shadow] duration-300",
          // Phones get a near-solid bar with a light blur: large backdrop blurs are the main cause of scroll jank on mobile GPUs.
          dark ? "bg-transparent" : "bg-cream/95 shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-md md:bg-cream/85 md:backdrop-blur-xl",
        )}
      >
        <div className="container-pb flex h-[var(--header-h)] items-center justify-between gap-6 2xl:max-w-[1440px]">
          <Logo dark={dark} />

          {/* Full link bar only where it fits on one line (logo + links + actions ≈ 1,300px, header up to
              1,440px wide at 2xl); smaller screens use the menu. The logo is the Home link here. */}
          <nav aria-label="Main" className="hidden items-center gap-0.5 2xl:flex">
            {NAV.filter((item) => item.href !== "/").map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative whitespace-nowrap rounded-full px-2.5 py-2 text-[0.88rem] font-medium transition-colors",
                    dark ? "text-white/75 hover:text-white" : "text-ink/70 hover:text-ink",
                    active && (dark ? "text-white" : "text-ink"),
                  )}
                >
                  <T k={navKey(item.href)} d={item.label} />
                  {active && (
                    <motion.span layoutId="nav-dot" className="absolute inset-x-2.5 -bottom-0.5 h-[2px] rounded-full bg-red" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/account"
              aria-label="Account and PB Rewards"
              className={cn("hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium sm:flex", dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/5")}
            >
              <Icon name="user" className="h-[18px] w-[18px]" />
              <span className="sr-only">Account</span>
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
              className={cn("relative grid h-10 w-10 place-items-center rounded-full", dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/5")}
            >
              <Icon name="bag" className="h-[19px] w-[19px]" />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[0.65rem] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
            <Link href="/repair" className={cn("btn hidden !py-2.5 !text-sm 2xl:inline-flex", dark ? "btn-gold" : "btn-red")}>
              Book a repair <Icon name="arrow-up-right" className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label="Menu"
              className={cn("grid h-10 w-10 place-items-center rounded-full 2xl:hidden", dark ? "text-white" : "text-ink")}
            >
              <Icon name={menu ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menu && (
            <motion.nav
              ref={navRef}
              aria-label="Mobile"
              style={menuMax ? { maxHeight: menuMax } : undefined}
              // Opacity + slide only (GPU-composited); animating height re-lays out the page every frame.
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              // Scrolls inside itself on short screens so the last links are always reachable.
              data-lenis-prevent
              className="max-h-[calc(100svh-var(--header-h))] overflow-y-auto overscroll-contain border-t border-ink/10 bg-cream 2xl:hidden"
            >
              <div className="container-pb flex flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                {NAV.map((item, i) => (
                  <motion.div key={item.href} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 * i }}>
                    <Link href={item.href} className="display flex items-center justify-between border-b border-ink/10 py-4 text-3xl">
                      <T k={navKey(item.href)} d={item.label} />
                      <Icon name="arrow-up-right" className="h-5 w-5 text-red" />
                    </Link>
                  </motion.div>
                ))}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href="/account" className="btn btn-ghost text-ink"><span><T k="menu.account" d="Account" /></span></Link>
                  <Link href="/loyalty" className="btn btn-gold"><T k="menu.rewards" d="PB Rewards" /></Link>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
