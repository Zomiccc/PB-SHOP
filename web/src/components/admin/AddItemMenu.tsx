"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ITEM_CATEGORIES } from "@/lib/constants";
import { Icon } from "../ui/Icon";

/** "Add Item" button → category dropdown → that category's form (master brief §10). */
export function AddItemMenu({ current }: { current?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="btn btn-gold !py-2.5 !text-sm">
        <Icon name="plus" className="h-4 w-4" /> Add item <Icon name="arrow-right" className={`h-3.5 w-3.5 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl bg-card py-1 shadow-2xl ring-1 ring-ink/15">
          {Object.entries(ITEM_CATEGORIES).map(([k, v]) => (
            <Link key={k} role="menuitem" href={`/admin/inventory/new?category=${k}`} onClick={() => setOpen(false)} className={`block px-4 py-2.5 text-sm hover:bg-ink/5 ${current === k ? "text-gold" : ""}`}>
              {v}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
