"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn, pkr } from "@/lib/format";
import { Icon } from "../ui/Icon";

type Line = { variantId: string; name: string; detail: string; sku: string; price: number; stock: number; qty: number };
type Customer = { found: boolean; name?: string; passportNo?: string; points?: number; careCards?: string[] };

const METHODS = { CASH: "Cash", CARD: "Card (terminal)", MOBILE_WALLET: "JazzCash / Easypaisa", BANK_TRANSFER: "Bank transfer" } as const;

/**
 * POS / scan-and-sell (§6, §19, §20). USB scanners act as a keyboard: they "type" the code and
 * press Enter into the focused scan box. Camera scanning is available on phones/tablets.
 */
export function Pos({ isSuper }: { isSuper: boolean }) {
  const [code, setCode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [customerResult, setCustomer] = useState<Customer | null>(null);
  const [method, setMethod] = useState<keyof typeof METHODS>("CASH");
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState<{ open: boolean; email: string; password: string; error?: string }>({ open: false, email: "", password: "" });
  const [done, setDone] = useState<{ orderId: string; number: string; total: number; careCard: string | null } | null>(null);
  const [camera, setCamera] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const shortfall = lines.filter((l) => l.qty > l.stock);
  // Only show a lookup result while the typed number is complete.
  const customer = phone.replace(/\D/g, "").length >= 11 ? customerResult : null;

  useEffect(() => {
    scanRef.current?.focus();
  }, [done]);

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

  async function lookup(raw: string) {
    const c = raw.trim();
    if (!c) return;
    setCode("");
    const res = await fetch(`/api/admin/pos/lookup?code=${encodeURIComponent(c)}`);
    const data = await res.json();
    if (!res.ok) {
      setFlash({ tone: "err", text: data.error });
      beep(220);
      return;
    }
    if (!data.active) {
      setFlash({ tone: "err", text: `${data.name} is deactivated` });
      beep(220);
      return;
    }
    beep(880);
    setFlash({ tone: data.stock > 0 ? "ok" : "err", text: `${data.name} · ${data.sku} · ${pkr(data.price)} · ${data.stock} in stock` });
    setLines((ls) => {
      const found = ls.find((l) => l.variantId === data.variantId);
      if (found) return ls.map((l) => (l.variantId === data.variantId ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { variantId: data.variantId, name: data.name, detail: data.detail, sku: data.sku, price: data.price, stock: data.stock, qty: 1 }];
    });
  }

  async function complete(withOverride = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          method,
          customerPhone: phone.trim() || undefined,
          customerName: name.trim() || undefined,
          note: note.trim() || undefined,
          discount: discount || undefined,
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
    setDiscount(0);
    setNote("");
    setMethod("CASH");
    setFlash(null);
    setDone(null);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-10 text-center shadow-[var(--shadow-lift)]">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-600 text-white"><Icon name="check" className="h-8 w-8" strokeWidth={2.5} /></span>
        <h2 className="display mt-5 text-4xl">Sale complete</h2>
        <p className="mt-2 text-muted">{done.number} · {pkr(done.total)} · stock updated</p>
        {done.careCard && <p className="mt-3 rounded-xl bg-navy-950 p-3 text-sm text-gold">Care Card {done.careCard} issued</p>}
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
          className="flex gap-2 rounded-2xl bg-navy-950 p-4"
        >
          <label htmlFor="scan" className="sr-only">Scan barcode or type SKU</label>
          <input
            id="scan"
            ref={scanRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            placeholder="Scan barcode or type SKU, then Enter"
            className="field field-dark flex-1 !py-4 font-mono text-lg"
          />
          <button type="button" onClick={() => setCamera(true)} className="btn btn-ghost-light" aria-label="Scan with camera">
            <Icon name="search" className="h-4 w-4" /> Camera
          </button>
        </form>
        {flash && <p role="status" className={cn("rounded-xl px-4 py-3 text-sm font-medium", flash.tone === "ok" ? "bg-emerald-600/10 text-emerald-700" : "bg-red/10 text-red")}>{flash.text}</p>}

        <div className="rounded-2xl bg-white shadow-[var(--shadow-card)]">
          {lines.length === 0 ? (
            <p className="p-10 text-center text-muted">Scan an item to start the sale.</p>
          ) : (
            <ul className="divide-y divide-ink/5">
              {lines.map((l) => (
                <li key={l.variantId} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-xs text-muted">{l.detail} · <span className="font-mono">{l.sku}</span> · {pkr(l.price)}</p>
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
        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="mb-3 font-semibold">Customer (optional — earns Passport points)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile 03xx…" aria-label="Customer mobile" className="field" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Customer name" className="field" />
          </div>
          {customer?.found && (
            <p className="mt-2 rounded-lg bg-navy-950 px-3 py-2 text-xs text-white">
              Passport <b className="text-gold">{customer.passportNo}</b> · {customer.points} pts{customer.careCards?.length ? ` · Care Card ${customer.careCards.join(", ")}` : ""}
            </p>
          )}
          {customer && !customer.found && <p className="mt-2 text-xs text-muted">New customer — a Passport will be created.</p>}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="mb-3 font-semibold">Payment</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(METHODS) as (keyof typeof METHODS)[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)} aria-pressed={method === m} className={cn("rounded-xl border p-3 text-sm", method === m ? "border-blue bg-blue/5 font-semibold ring-1 ring-blue" : "border-ink/15")}>
                {METHODS[m]}
              </button>
            ))}
          </div>
          <label className="mt-3 block"><span className="label">Discount (PKR)</span><input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} className="field" /></label>
          <label className="mt-3 block"><span className="label">Sale note (§17)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What was sold, special instructions…" className="field" /></label>
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
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
              <button onClick={() => setOverride({ open: false, email: "", password: "" })} className="btn btn-ghost flex-1 text-navy-950"><span>Cancel</span></button>
              <button disabled={busy} onClick={() => complete(true)} className="btn btn-red flex-1">Authorise sale</button>
            </div>
          </div>
        </div>
      )}

      {camera && <CameraScanner onClose={() => setCamera(false)} onCode={(c) => { setCamera(false); lookup(c); }} />}
    </div>
  );
}

function CameraScanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onCode);
  useEffect(() => {
    cb.current = onCode;
  }, [onCode]);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (result) => {
          if (result && !cancelled) {
            cancelled = true;
            cb.current(result.getText());
          }
        });
        stop = () => controls.stop();
      } catch {
        setError("Camera unavailable — allow camera access or use a USB scanner.");
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4" role="dialog" aria-label="Camera scanner">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-navy-950 text-white">
        <video ref={video} className="aspect-[4/3] w-full bg-black object-cover" muted playsInline />
        <div className="flex items-center justify-between p-4 text-sm">
          <span>{error ?? "Point the camera at the barcode"}</span>
          <button onClick={onClose} className="btn btn-ghost-light !py-2">Close</button>
        </div>
      </div>
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
