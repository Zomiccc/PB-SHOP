"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  sku: string;
  price: number;
  qty: number;
  maxQty: number;
  colorHex?: string | null;
  kind: "PHONE" | "TABLET" | "ACCESSORY";
  accessoryType?: string | null;
};

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (item: CartItem) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              open: true,
              items: s.items.map((i) => (i.variantId === item.variantId ? { ...i, qty: Math.min(i.qty + item.qty, i.maxQty) } : i)),
            };
          }
          return { open: true, items: [...s.items, { ...item, qty: Math.min(item.qty, item.maxQty) }] };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty)) } : i)) })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    // Rehydrated from <StoreProviders> after mount to avoid SSR hydration mismatches.
    { name: "pb-cart", partialize: (s) => ({ items: s.items }), skipHydration: true },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.qty * i.price, 0);
