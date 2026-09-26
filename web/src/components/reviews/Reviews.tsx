"use client";

import { useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

export type ReviewItem = { id: string; customerName: string; rating: number; title: string | null; body: string; verified: boolean; createdAt: string; productName?: string | null };

export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-gold" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={className} fill={i <= Math.round(value) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} aria-hidden>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      ))}
    </span>
  );
}

export function ReviewCard({ r }: { r: ReviewItem }) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-white/8">
      <div className="flex items-center justify-between gap-3">
        <Stars value={r.rating} />
        <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</span>
      </div>
      {r.title && <h3 className="mt-3 font-semibold">{r.title}</h3>}
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/80">“{r.body}”</p>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <b>{r.customerName}</b>
        {r.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-300">
            <Icon name="check" className="h-3 w-3" /> Verified customer
          </span>
        )}
        {r.productName && <span className="text-xs text-muted">· {r.productName}</span>}
      </p>
    </article>
  );
}

/** Review submission form. Reviews appear after staff approval (moderation, master brief §17). */
export function ReviewForm({ productId, productName }: { productId?: string; productName?: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, name: f.get("name"), phone: f.get("phone"), rating, title: f.get("title"), body: f.get("body"), website: f.get("website") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setMsg(data.error);
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-gold/30">
        <Icon name="check" className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 font-semibold">Thank you for your review!</p>
        <p className="mt-1 text-sm text-muted">It will appear once our team has checked it.</p>
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0];
  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-white/8 md:p-6">
      <p className="font-semibold">{productName ? `Review the ${productName}` : "Tell others about your visit"}</p>
      {msg && <p role="alert" className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{msg}</p>}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <span className="label">Your rating</span>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(i)}
              onClick={() => setRating(i)}
              className="p-0.5 text-gold"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill={i <= (hover || rating) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
              </svg>
            </button>
          ))}
        </div>
        {err("rating") && <p className="mt-1 text-sm text-red">{err("rating")}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Name</span><input name="name" autoComplete="name" className="field" aria-invalid={!!err("name")} />{err("name") && <span className="mt-1 block text-sm text-red">{err("name")}</span>}</label>
        <label className="block"><span className="label">Mobile (optional, private)</span><input name="phone" type="tel" autoComplete="tel" className="field" aria-invalid={!!err("phone")} />{err("phone") && <span className="mt-1 block text-sm text-red">{err("phone")}</span>}</label>
      </div>
      <label className="block"><span className="label">Title (optional)</span><input name="title" maxLength={80} className="field" /></label>
      <label className="block"><span className="label">Your review</span><textarea name="body" rows={3} className="field" aria-invalid={!!err("body")} />{err("body") && <span className="mt-1 block text-sm text-red">{err("body")}</span>}</label>
      <p className="text-xs text-muted">Your number is only used to mark you as a verified customer — it&apos;s never shown.</p>
      <button disabled={busy} className={cn("btn btn-gold w-full disabled:opacity-50")}>{busy ? "Sending…" : "Submit review"}</button>
    </form>
  );
}
