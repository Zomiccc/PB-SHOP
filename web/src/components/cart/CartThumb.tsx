"use client";

import type { CartItem } from "@/store/cart";
import { ProductArt } from "../product/ProductArt";
import { SkinPreview } from "../skins/SkinPreview";

/** Bag / checkout thumbnail: product art, or the custom skin fitted to the chosen phone. */
export function CartThumb({ item }: { item: CartItem }) {
  if (item.kind === "SKIN" && item.skin) {
    return <SkinPreview template={item.skin.template} imageUrl={item.skin.ownImage ?? item.skin.imageUrl} look={item.skin.look} cameraCover={item.skin.cameraCover} className="h-full w-full p-1" label={item.name} />;
  }
  return <ProductArt kind={item.kind === "SKIN" ? "ACCESSORY" : item.kind} accessoryType={item.accessoryType} colorHex={item.colorHex} name={item.name} compact />;
}

/** Where a bag line links to. */
export const cartHref = (item: CartItem) => (item.kind === "SKIN" ? `/${item.slug}` : `/product/${item.slug}`);
