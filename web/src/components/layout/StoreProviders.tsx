"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { MotionConfig } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCart } from "@/store/cart";

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scrolling wired into GSAP's ticker so ScrollTrigger scenes stay in sync. */
export function StoreProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    // Links like /installments#calculator land on that section; everything else starts at the top.
    const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (!target) window.scrollTo(0, 0);
    const t = setTimeout(() => {
      ScrollTrigger.refresh();
      target?.scrollIntoView({ block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [pathname]);

  // Honour the OS "reduce motion" setting for every motion component (accessibility, brief §10).
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
