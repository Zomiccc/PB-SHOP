"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MANUAL_METHODS, PAYMENT_ACCOUNTS, type ManualMethod } from "@/lib/payment-accounts";
import { cn, pkr } from "@/lib/format";
import { Icon } from "../ui/Icon";

/**
 * Pay-by-transfer step after checkout (client request): pick Easypaisa, JazzCash or Faysal Bank, copy the
 * account details (JazzCash and Faysal also show their QR code), pay the exact total, then upload the receipt.
 */
export function PaymentPanel({ order, token, total, initialMethod }: { order: string; token: string; total: number; initialMethod: ManualMethod }) {
  const router = useRouter();
  const [method, setMethod] = useState<ManualMethod>(initialMethod);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [zoomQr, setZoomQr] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const acc = PAYMENT_ACCOUNTS[method];

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers: select-and-copy fallback.
      const t = document.createElement("textarea");
      t.value = value;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Attach a screenshot or PDF of your payment receipt.");
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      f.set("order", order);
      f.set("t", token);
      f.set("method", method);
      f.set("file", await shrink(file));
      const res = await fetch("/api/orders/proof", { method: "POST", body: f });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Upload failed — please try again.");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-6 text-left">
      {/* 1 — choose how to pay */}
      <section>
        <p className="mb-3 text-sm font-semibold"><span className="font-mono text-xs text-gold">01</span> Choose how you&apos;ll pay</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
          {MANUAL_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => setMethod(m)}
              className={cn("rounded-xl px-2 py-3 text-center text-sm font-semibold ring-1 transition", method === m ? "bg-gold text-[#120d02] ring-gold" : "bg-white/[0.04] ring-white/15 hover:ring-gold/60")}
            >
              {PAYMENT_ACCOUNTS[m].label}
            </button>
          ))}
        </div>
      </section>

      {/* 2 — account details (+ QR) */}
      <section className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 md:p-5">
        <p className="mb-3 text-sm font-semibold"><span className="font-mono text-xs text-gold">02</span> Send exactly <span className="text-gold">{pkr(total)}</span> to</p>
        <div className={cn("grid gap-5", acc.qr && "sm:grid-cols-[1fr_190px]")}>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-white/55">Account title</dt>
              <dd className="font-semibold">{acc.accountTitle}</dd>
            </div>
            {acc.details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs text-white/55">{d.label}</dt>
                <dd className="mt-0.5 flex items-center justify-between gap-2 rounded-xl bg-black/40 px-3 py-2 ring-1 ring-white/10">
                  <span className="min-w-0 break-all font-mono text-[0.95rem] font-semibold tracking-wide">{d.value}</span>
                  {d.label !== "Branch" && (
                    <button type="button" onClick={() => copy(d.label, d.value)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition", copied === d.label ? "bg-emerald-500 text-white" : "bg-gold text-[#120d02] hover:brightness-110")}>
                      {copied === d.label ? "Copied ✓" : "Copy"}
                    </button>
                  )}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-white/55">Amount</dt>
              <dd className="mt-0.5 flex items-center justify-between gap-2 rounded-xl bg-black/40 px-3 py-2 ring-1 ring-white/10">
                <span className="font-mono text-[0.95rem] font-semibold">{total}</span>
                <button type="button" onClick={() => copy("amount", String(total))} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold", copied === "amount" ? "bg-emerald-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}>
                  {copied === "amount" ? "Copied ✓" : "Copy"}
                </button>
              </dd>
            </div>
          </dl>
          {acc.qr && (
            <div className="text-center">
              <button type="button" onClick={() => setZoomQr(true)} className="block w-full overflow-hidden rounded-xl bg-white p-2 ring-1 ring-white/20" aria-label={`Show the ${acc.label} QR code larger`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static QR image, must stay pixel-sharp */}
                <img src={acc.qr} alt={`${acc.label} QR code for ${acc.accountTitle}`} className="mx-auto w-full [image-rendering:crisp-edges]" />
              </button>
              <p className="mt-1.5 text-xs text-white/55">Scan with your {acc.label} app · tap to enlarge</p>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-white/60">{acc.how}</p>
      </section>

      {/* 3 — upload the receipt */}
      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 md:p-5">
        <p className="text-sm font-semibold"><span className="font-mono text-xs text-gold">03</span> Upload your payment receipt</p>
        <input ref={input} type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gold/50 px-4 py-4 text-left text-sm transition hover:bg-gold/5">
          <Icon name="upload" className="h-5 w-5 shrink-0 text-gold" />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{file ? file.name : "Choose a screenshot or PDF"}</span>
            <span className="text-xs text-white/55">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · tap to change` : "The confirmation screen from your app, showing the amount and transaction ID"}</span>
          </span>
        </button>
        <label className="block">
          <span className="label">Transaction ID (optional)</span>
          <input name="reference" maxLength={80} placeholder="e.g. 0123456789" className="field" autoComplete="off" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
        <button disabled={busy} className="btn btn-gold w-full !py-3.5 disabled:opacity-60">
          {busy ? "Sending…" : "Send payment receipt"}
        </button>
        <p className="text-center text-xs text-white/50">We check every receipt by hand and confirm your order on WhatsApp / SMS.</p>
      </form>

      {zoomQr && acc.qr && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4" onClick={() => setZoomQr(false)} role="dialog" aria-modal="true" aria-label={`${acc.label} QR code`}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static QR image */}
            <img src={acc.qr} alt={`${acc.label} QR code`} className="w-full" />
            <p className="mt-2 text-center text-sm font-semibold text-black">{acc.accountTitle} · tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Large phone photos are scaled down in the browser (keeps uploads under the 4 MB limit). PDFs pass through. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 3_000_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bitmap.width * scale);
    c.height = Math.round(bitmap.height * scale);
    c.getContext("2d")?.drawImage(bitmap, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
