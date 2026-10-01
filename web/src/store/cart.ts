"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SkinTemplate } from "@/lib/skin-template";

/** A custom skin in the bag: the server rebuilds its name and price from these ids at checkout. */
export type CartSkin = {
  typeId: string;
  modelId: string;
  designId: string | null; // null = no design (jelly) or the customer's own picture
  cameraCover: boolean;
  /** The customer's own picture (JPEG data URL) — sent with the order so staff can print it. */
  ownImage?: string | null;
  /** For the bag thumbnail only. */
  template: SkinTemplate;
  imageUrl?: string | null;
  look?: string;
};

export type CartItem = {
  /** Unique line id: the variant id for products; one per configuration for custom skins. */
  key?: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  sku: string;
  price: number;
  qty: number;
  maxQty: number;
  colorHex?: string | null;
  kind: "PHONE" | "TABLET" | "ACCESSORY" | "SKIN";
  accessoryType?: string | null;
  skin?: CartSkin;
};

export const lineKey = (i: Pick<CartItem, "key" | "variantId">) => i.key ?? i.variantId;

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (item: CartItem) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
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
          const existing = s.items.find((i) => lineKey(i) === lineKey(item));
          if (existing) {
            return {
              open: true,
              items: s.items.map((i) => (lineKey(i) === lineKey(item) ? { ...i, qty: Math.min(i.qty + item.qty, i.maxQty) } : i)),
            };
          }
          return { open: true, items: [...s.items, { ...item, qty: Math.min(item.qty, item.maxQty) }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (lineKey(i) === key ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => lineKey(i) !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    // Rehydrated from <StoreProviders> after mount to avoid SSR hydration mismatches.
    { name: "pb-cart", partialize: (s) => ({ items: s.items }), skipHydration: true },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.qty * i.price, 0);
