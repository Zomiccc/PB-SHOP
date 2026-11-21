"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn, pkr } from "@/lib/format";
import { Icon } from "../ui/Icon";

type Line = { variantId: string; name: string; detail: string; sku: string; price: number; listPrice: number; floor: number; stock: number; qty: number };
type Item = { variantId: string; name: string; detail: string; sku: string; price: number; floor: number; stock: number; active: boolean };
type Reward = { id: string; name: string; pointsCost: number };
type Customer = { found: boolean; name?: string; passportNo?: string; points?: number };

const METHODS = { CASH: "Cash", CARD: "Card (terminal)", MOBILE_WALLET: "JazzCash / Easypaisa", BANK_TRANSFER: "Bank transfer" } as const;

/**
 * POS / sell (§6, §19, §20; simplified Nov 2026). One box: type a product name or model and tap a result, or
 * scan a barcode (USB scanners type the code and press Enter). A salesman can lower a line's price down to the
 * item's offer / discount price; the owner has no limit.
 */
export function Pos({ isSuper, rewards }: { isSuper: boolean; rewards: Reward[] }) {
  const [code, setCode] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [rewardId, setRewardId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [customerResult, setCustomer] = useState<Customer | null>(null);
  const [method, setMethod] = useState<keyof typeof METHODS>("CASH");
  const [salePrice, setSalePrice] = useState("");
  const [note, setNote] = useState("");
  const [points, setPoints] = useState("");
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState<{ open: boolean; email: string; password: string; error?: string }>({ open: false, email: "", password: "" });
  const [done, setDone] = useState<{ orderId: string; number: string; total: number } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const agreed = salePrice.trim() === "" ? subtotal : Math.max(0, Math.round(Number(salePrice) || 0));
  const discount = Math.max(0, subtotal - agreed);
  const total = subtotal - discount;
  const shortfall = lines.filter((l) => l.qty > l.stock);
  // Only show a lookup result while the typed number is complete.
  const customer = phone.replace(/\D/g, "").length >= 11 ? customerResult : null;

  useEffect(() => {
    scanRef.current?.focus();
  }, [done]);

  // Search as you type (name, model, SKU…). A scanned barcode is typed fast and ends with Enter.
  useEffect(() => {
    const q = code.trim();
    if (q.length < 2) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/pos/search?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => ({ results: [] }));
      setResults(r.results ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [code]);

  function add(data: Item) {
    if (!data.active) {
      setFlash({ tone: "err", text: `${data.name} is switched off` });
      beep(220);
      return;
    }
    beep(880);
    setCode("");
    setResults([]);
    setFlash({ tone: data.stock > 0 ? "ok" : "err", text: `${data.name}${data.detail ? ` · ${data.detail}` : ""} · ${pkr(data.price)} · ${data.stock} in stock` });
    setLines((ls) => {
      const found = ls.find((l) => l.variantId === data.variantId);
      if (found) return ls.map((l) => (l.variantId === data.variantId ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { variantId: data.variantId, name: data.name, detail: data.detail, sku: data.sku, price: data.price, listPrice: data.price, floor: data.floor, stock: data.stock, qty: 1 }];
    });
    scanRef.current?.focus();
  }

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 11) return;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/customer-lookup?phone=${encodeURIComponent(phone)}`).then((x) => x.json());
      setCustomer(r);
      if (r.found && !name) setName(r.name);
    }, 350);
    return () => clearTimeout(t);
  }, [phone, name]);

  /** Enter: a barcode / SKU / IMEI adds that item straight away; otherwise the only search result is added. */
  async function lookup(raw: string) {
    const c = raw.trim();
    if (!c) return;
    const res = await fetch(`/api/admin/pos/lookup?code=${encodeURIComponent(c)}`);
    if (res.ok) return add(await res.json());
    const r = await fetch(`/api/admin/pos/search?q=${encodeURIComponent(c)}`).then((x) => x.json()).catch(() => ({ results: [] }));
    if (r.results?.length === 1) return add(r.results[0]);
    setResults(r.results ?? []);
    if (!r.results?.length) {
      setFlash({ tone: "err", text: `Nothing found for “${c}”` });
      beep(220);
    }
  }

  async function complete(withOverride = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty, ...(l.price !== l.listPrice ? { unitPrice: l.price } : {}) })),
          rewardId: phone.trim() && rewardId ? rewardId : undefined,
          method,
          customerPhone: phone.trim() || undefined,
          customerName: name.trim() || undefined,
          note: note.trim() || undefined,
          discount: discount || undefined,
          points: phone.trim() && points !== "" ? Math.max(0, Math.floor(Number(points) || 0)) : undefined,
          override: withOverride ? (isSuper ? {} : { email: override.email, password: override.password }) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsOverride) setOverride((o) => ({ ...o, open: true, error: undefined }));
        else if (withOverride) setOverride((o) => ({ ...o, error: data.error }));
        else setFlash({ tone: "err", text: data.error });
        return;
      }
      setOverride({ open: false, email: "", password: "" });
      setDone(data);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setLines([]);
    setPhone("");
    setName("");
    setCustomer(null);
    setSalePrice("");
    setNote("");
    setPoints("");
    setRewardId("");
    setCode("");
    setResults([]);
    setMethod("CASH");
    setFlash(null);
    setDone(null);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-card p-10 text-center shadow-[var(--shadow-lift)]">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-white"><Icon name="check" className="h-8 w-8" strokeWidth={2.5} /></span>
        <h2 className="display mt-5 text-4xl">Sale complete</h2>
        <p className="mt-2 text-muted">{done.number} · {pkr(done.total)} · stock updated</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href={`/admin/orders/${done.orderId}/receipt`} target="_blank" className="btn btn-primary">Print receipt</Link>
          <button onClick={reset} className="btn btn-red">New sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(code);
          }}
          className="relative rounded-2xl bg-navy-950 p-4"
        >
          <label htmlFor="scan" className="sr-only">Search a product or scan a barcode</label>
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
            <input
              id="scan"
              ref={scanRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (e.target.value.trim().length < 2) setResults([]);
              }}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Type a name or model (e.g. Note 60) or scan a barcode"
              className="field field-dark w-full !py-4 !pl-12 text-lg"
            />
          </div>
          {results.length > 0 && code.trim().length >= 2 && (
            <ul className="mt-2 max-h-[60vh] divide-y divide-white/8 overflow-y-auto rounded-xl bg-white/[0.04] ring-1 ring-white/10" role="listbox" aria-label="Search results">
              {results.map((r) => (
                <li key={r.variantId}>
                  <button type="button" onClick={() => add(r)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-white transition hover:bg-white/10">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{r.name}</span>
                      <span className="block text-xs text-white/55">{[r.detail, r.sku].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="block">{pkr(r.price)}</b>
                      <span className={cn("text-xs", r.stock > 0 ? "text-emerald-400" : "text-red")}>{r.stock > 0 ? `${r.stock} in stock` : "out of stock"}</span>
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-[#120d02]"><Icon name="plus" className="h-4 w-4" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        {flash && <p role="status" className={cn("rounded-xl px-4 py-3 text-sm font-medium", flash.tone === "ok" ? "bg-emerald-600/10 text-emerald-400" : "bg-red/10 text-red")}>{flash.text}</p>}

        <div className="rounded-2xl bg-card shadow-[var(--shadow-card)]">
          {lines.length === 0 ? (
            <p className="p-10 text-center text-muted">Search or scan an item to start the sale.</p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {lines.map((l) => (
                <li key={l.variantId} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-xs text-muted">{[l.detail, l.sku].filter(Boolean).join(" · ")}</p>
                    <label className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted">Price</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={isSuper ? 0 : l.floor}
                        value={l.price || ""}
                        onChange={(e) => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, price: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x)))}
                        aria-label={`Price for ${l.name}`}
                        className={cn("field !w-28 !py-1.5 !text-sm", !isSuper && l.price < l.floor && "!ring-2 !ring-red")}
                      />
                      {!isSuper && l.floor < l.listPrice && <span className={cn(l.price < l.floor ? "font-semibold text-red" : "text-muted")}>lowest {pkr(l.floor)}</span>}
                      {l.price !== l.listPrice && <button type="button" onClick={() => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, price: x.listPrice } : x)))} className="text-blue underline-offset-2 hover:underline">reset to {pkr(l.listPrice)}</button>}
                    </label>
                    <p className={cn("text-xs", l.qty > l.stock ? "font-semibold text-red" : "text-muted")}>{l.stock} available{l.qty > l.stock ? " — exceeds stock" : ""}</p>
                  </div>
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button aria-label="Less" onClick={() => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} className="grid h-9 w-9 place-items-center"><Icon name="minus" className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center font-semibold">{l.qty}</span>
                    <button aria-label="More" onClick={() => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, qty: x.qty + 1 } : x)))} className="grid h-9 w-9 place-items-center"><Icon name="plus" className="h-3.5 w-3.5" /></button>
                  </div>
                  <b className="w-28 text-right">{pkr(l.price * l.qty)}</b>
                  <button aria-label="Remove" onClick={() => setLines((ls) => ls.filter((x) => x.variantId !== l.variantId))} className="text-muted hover:text-red"><Icon name="close" className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="mb-3 font-semibold">Customer (optional — earns PB Points)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile 03xx…" aria-label="Customer mobile" className="field" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Customer name" className="field" />
          </div>
          {customer?.found && (
            <p className="mt-2 rounded-lg bg-navy-950 px-3 py-2 text-xs text-white">
              Rewards ID <b className="text-gold">{customer.passportNo}</b> · {customer.points} pts
            </p>
          )}
          {customer && !customer.found && <p className="mt-2 text-xs text-muted">New customer — a PB Rewards account will be created.</p>}
          {customer?.found && rewards.some((r) => r.pointsCost <= (customer.points ?? 0)) && (
            <label className="mt-3 block">
              <span className="label">Use points (optional)</span>
              <select value={rewardId} onChange={(e) => setRewardId(e.target.value)} className="field">
                <option value="">No reward</option>
                {rewards.filter((r) => r.pointsCost <= (customer.points ?? 0)).map((r) => <option key={r.id} value={r.id}>{r.name} — {r.pointsCost} points</option>)}
              </select>
              <span className="mt-1 block text-xs text-muted">Hand over the reward; the points used are printed on the bill.</span>
            </label>
          )}
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
          <p className="mb-3 font-semibold">Payment</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(METHODS) as (keyof typeof METHODS)[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)} aria-pressed={method === m} className={cn("rounded-xl border p-3 text-sm", method === m ? "border-blue bg-blue/5 font-semibold ring-1 ring-blue" : "border-ink/15")}>
                {METHODS[m]}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="label">Sale price (PKR)</span>
            <input type="number" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder={subtotal ? String(subtotal) : "Final agreed price"} className="field" />
            <span className="mt-1 block text-xs text-muted">{discount > 0 ? `Discount: ${pkr(discount)} (worked out automatically)` : "Type the final agreed price. Leave empty for the full price."}</span>
          </label>
          {phone.trim() && (
            <label className="mt-3 block">
              <span className="label">PB Points to give</span>
              <input type="number" min={0} max={10000} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Automatic (20 new phone · 15 used phone)" className="field" />
              <span className="mt-1 block text-xs text-white/50">Leave empty for the automatic points, or type the number you want to give (0 = none). Recorded in the audit log.</span>
            </label>
          )}
          <label className="mt-3 block"><span className="label">Sale note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What was sold, special instructions…" className="field" /></label>
        </div>

        <div className="rounded-2xl bg-navy-950 p-5 text-white">
          <div className="flex justify-between text-sm text-white/70"><span>Subtotal</span><span>{pkr(subtotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-sm text-white/70"><span>Discount</span><span>−{pkr(discount)}</span></div>}
          <div className="mt-2 flex justify-between text-2xl font-bold"><span>Total</span><span>{pkr(total)}</span></div>
          {shortfall.length > 0 && <p className="mt-3 rounded-lg bg-red/20 px-3 py-2 text-xs">Some items exceed stock — the owner must authorise a zero-stock sale.</p>}
          <button disabled={!lines.length || busy} onClick={() => complete(false)} className="btn btn-red mt-4 w-full !py-4 text-base disabled:opacity-40">
            {busy ? "Processing…" : `Complete sale · ${pkr(total)}`}
          </button>
        </div>
      </div>

      {override.open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-navy-950/60 p-4" role="dialog" aria-label="Owner override">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6">
            <h3 className="display text-2xl">Owner authorisation</h3>
            <p className="mt-1 text-sm text-muted">This sale includes items with insufficient stock. {isSuper ? "Confirm to proceed (logged in the audit trail)." : "The owner must enter their credentials. The override is logged."}</p>
            {!isSuper && (
              <div className="mt-4 space-y-2">
                <input value={override.email} onChange={(e) => setOverride((o) => ({ ...o, email: e.target.value }))} placeholder="Owner email" aria-label="Owner email" className="field" />
                <input type="password" value={override.password} onChange={(e) => setOverride((o) => ({ ...o, password: e.target.value }))} placeholder="Owner password" aria-label="Owner password" className="field" />
              </div>
            )}
            {override.error && <p className="mt-3 text-sm text-red">{override.error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setOverride({ open: false, email: "", password: "" })} className="btn btn-ghost flex-1 text-ink"><span>Cancel</span></button>
              <button disabled={busy} onClick={() => complete(true)} className="btn btn-red flex-1">Authorise sale</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function beep(freq: number) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.08);
  } catch {}
}
