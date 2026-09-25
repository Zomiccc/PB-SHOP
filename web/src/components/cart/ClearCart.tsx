"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/** Empties the bag once an order is confirmed. */
export function ClearCart() {
  useEffect(() => {
    const clear = () => useCart.getState().clear();
    if (useCart.persist.hasHydrated()) clear();
    return useCart.persist.onFinishHydration(clear);
  }, []);
  return null;
}
