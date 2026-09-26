"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NAV } from "@/lib/constants";
import { cartCount, useCart } from "@/store/cart";
import { cn } from "@/lib/format";
import { Logo } from "./Logo";
import { Icon } from "../ui/Icon";

/** Pages whose first screen is dark navy — header starts in its light-on-dark state. */
const DARK_TOP = ["/", "/loyalty", "/repair"];

export function Header() {
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const count = cartCount(items);

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
              <span className="text-gold">★</span> Phones
            </Link>
            <Link href="/repair" className="hover:text-white">Repairs</Link>
            <Link href="/accessories" className="hover:text-white">Accessories</Link>
            <Link href="/installments" className="text-gold hover:text-gold-soft">Installments</Link>
          </div>
          <div className="flex items-center gap-6">
            <span>Secure JazzCash / wallet / bank payments</span>
            <Link href="/loyalty" className="text-gold hover:text-gold-soft">PB Phone Passport →</Link>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500",
          dark ? "bg-transparent" : "bg-cream/85 shadow-[0_1px_0_rgb(7_26_43/0.08)] backdrop-blur-xl",
        )}
      >
        <div className="container-pb flex h-[var(--header-h)] items-center justify-between gap-6">
          <Logo dark={dark} />

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative whitespace-nowrap rounded-full px-3 py-2 text-[0.9rem] font-medium transition-colors",
                    dark ? "text-white/75 hover:text-white" : "text-ink/70 hover:text-ink",
                    active && (dark ? "text-white" : "text-ink"),
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span layoutId="nav-dot" className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-red" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/account"
              aria-label="Account and PB Phone Passport"
              className={cn("hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium sm:flex", dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/5")}
            >
              <Icon name="user" className="h-[18px] w-[18px]" />
              <span className="hidden xl:inline">Account</span>
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
            <Link href="/repair" className={cn("btn hidden !py-2.5 !text-sm xl:inline-flex", dark ? "btn-gold" : "btn-red")}>
              Book a repair <Icon name="arrow-up-right" className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-label="Menu"
              className={cn("grid h-10 w-10 place-items-center rounded-full lg:hidden", dark ? "text-white" : "text-ink")}
            >
              <Icon name={menu ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menu && (
            <motion.nav
              aria-label="Mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden border-t border-ink/10 bg-cream lg:hidden"
            >
              <div className="container-pb flex flex-col py-4">
                {NAV.map((item, i) => (
                  <motion.div key={item.href} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.04 * i }}>
                    <Link href={item.href} className="display flex items-center justify-between border-b border-ink/10 py-4 text-3xl">
                      {item.label}
                      <Icon name="arrow-up-right" className="h-5 w-5 text-red" />
                    </Link>
                  </motion.div>
                ))}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href="/account" className="btn btn-ghost text-navy-950"><span>Account</span></Link>
                  <Link href="/loyalty" className="btn btn-gold">Passport</Link>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
