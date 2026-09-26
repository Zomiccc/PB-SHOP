"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cartSubtotal, useCart } from "@/store/cart";
import { pkr } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { ProductArt } from "../product/ProductArt";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  const subtotal = cartSubtotal(items);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-navy-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col bg-cream shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            data-lenis-prevent
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <h2 className="display text-2xl">Your bag</h2>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
                <Icon name="close" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-navy-950 text-gold">
                  <Icon name="bag" className="h-7 w-7" />
                </div>
                <p className="text-muted">Your bag is empty.</p>
                <Link href="/new-phones" onClick={() => setOpen(false)} className="btn btn-primary">Shop new phones</Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                  {items.map((item) => (
                    <li key={item.variantId} className="card flex gap-4 p-3">
                      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream-200">
                        <ProductArt kind={item.kind} accessoryType={item.accessoryType} colorHex={item.colorHex} name={item.name} compact />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link href={`/product/${item.slug}`} onClick={() => setOpen(false)} className="truncate font-semibold hover:text-blue">
                          {item.name}
                        </Link>
                        <p className="truncate text-xs text-muted">{item.variantLabel}</p>
                        <p className="font-mono text-[0.65rem] text-muted">{item.sku}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-ink/15">
                            <button aria-label="Decrease quantity" onClick={() => setQty(item.variantId, item.qty - 1)} className="grid h-8 w-8 place-items-center">
                              <Icon name="minus" className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                            <button
                              aria-label="Increase quantity"
                              disabled={item.qty >= item.maxQty}
                              onClick={() => setQty(item.variantId, item.qty + 1)}
                              className="grid h-8 w-8 place-items-center disabled:opacity-30"
                            >
                              <Icon name="plus" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="font-semibold">{pkr(item.price * item.qty)}</span>
                        </div>
                      </div>
                      <button onClick={() => remove(item.variantId)} aria-label={`Remove ${item.name}`} className="self-start text-muted hover:text-red">
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-ink/10 bg-card px-6 py-5">
                  <div className="flex justify-between text-sm text-muted">
                    <span>Subtotal</span>
                    <span className="text-lg font-bold text-ink">{pkr(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Delivery and loyalty points are calculated at checkout.</p>
                  <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-red mt-4 w-full">
                    Checkout securely <Icon name="arrow-right" className="h-4 w-4" />
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
