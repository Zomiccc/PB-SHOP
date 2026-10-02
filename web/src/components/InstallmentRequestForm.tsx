"use client";

import { useEffect, useState } from "react";
import { cn, pkr } from "@/lib/format";
import { timeLabel } from "@/lib/appointments";
import { Icon } from "./ui/Icon";

export type InstallmentPlan = { phoneModel: string; price?: number; downPercent?: number; terms?: number; perInstallment?: number; listingId?: string };
type Slot = { time: string; available: boolean; full: boolean };
type Errors = Record<string, string[] | undefined>;

/** The calculator / phone picker send the chosen plan here ("Book an appointment with this plan"). */
export const PLAN_EVENT = "pb:installment-plan";
export function choosePlan(plan: InstallmentPlan) {
  window.dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: plan }));
  document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Installment request + appointment (v6 §7): customer details, the plan, an available date and time slot
 * (full or past slots can't be picked), then a confirmation. The purchase is completed in store with the CNIC.
 */
export function InstallmentRequestForm({ dates, phones }: { dates: string[]; phones: string[] }) {
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);
  const [model, setModel] = useState("");
  const [date, setDate] = useState(dates[0] ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ref: string; when: string; phoneModel: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const on = (e: Event) => {
      const p = (e as CustomEvent<InstallmentPlan>).detail;
      setPlan(p);
      setModel(p.phoneModel);
    };
    window.addEventListener(PLAN_EVENT, on);
    return () => window.removeEventListener(PLAN_EVENT, on);
  }, []);

  useEffect(() => {
    if (!date) return;
    let live = true;
    fetch(`/api/installments/slots?date=${date}`)
      .then((r) => r.json())
      .then((d) => live && setSlots(d.slots ?? []))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [date, reload]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setMsg(null);
    if (!time) {
      setErrors({ time: ["Choose a time"] });
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const sameModel = plan && plan.phoneModel === model;
      const res = await fetch("/api/installments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
          email: f.get("email"),
          city: f.get("city"),
          phoneModel: model,
          notes: f.get("notes") || undefined,
          date,
          time,
          agree: f.get("agree") === "on",
          ...(sameModel ? { listingId: plan.listingId, price: plan.price, downPercent: plan.downPercent, terms: plan.terms, perInstallment: plan.perInstallment } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setMsg(data.error);
        if (res.status === 409) {
          setTime("");
          setReload((n) => n + 1); // refresh the slots — someone may have just taken one
        }
        return;
      }
      setDone(data);
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k]?.[0];

  if (done) {
    return (
      <div role="status" className="card mx-auto max-w-2xl p-6 text-center md:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><Icon name="check" className="h-7 w-7" strokeWidth={3} /></span>
        <h3 className="display mt-4 text-3xl">You&apos;re booked!</h3>
        <p className="mt-2 text-white/80">Your installment appointment for <b>{done.phoneModel}</b> is on</p>
        <p className="display mt-1 text-2xl text-gold">{done.when}</p>
        <p className="mt-3 text-sm text-muted">Reference <b className="font-mono text-white">{done.ref}</b> · we&apos;ll confirm on WhatsApp / SMS.</p>
        <p className="mx-auto mt-5 flex max-w-md items-start gap-2 rounded-xl bg-gold/10 p-3 text-left text-sm text-gold-soft ring-1 ring-gold/30">
          <Icon name="id-card" className="mt-0.5 h-4 w-4 shrink-0" /> Please bring your original CNIC — the purchase is completed in store.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card mx-auto max-w-3xl space-y-6 p-5 md:p-8">
      {msg && <p role="alert" className="rounded-xl bg-red/10 px-4 py-3 text-sm text-red">{msg}</p>}

      {plan && (
        <div className="rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Your plan</p>
          <p className="mt-1 font-semibold">{plan.phoneModel}</p>
          <p className="text-sm text-white/75">
            {[plan.price && `Price ${pkr(plan.price)}`, plan.downPercent != null && `${plan.downPercent}% down`, plan.terms && plan.perInstallment && `${plan.terms} × ${pkr(plan.perInstallment)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">1. Your details</legend>
        <F label="Full name" error={err("name")}><input name="name" autoComplete="name" required className="field" aria-invalid={!!err("name")} /></F>
        <F label="Mobile number" error={err("phone")}><input name="phone" type="tel" autoComplete="tel" required placeholder="0300 1234567" className="field" aria-invalid={!!err("phone")} /></F>
        <F label="Email (optional)" error={err("email")}><input name="email" type="email" autoComplete="email" className="field" aria-invalid={!!err("email")} /></F>
        <F label="City (optional)" error={err("city")}><input name="city" autoComplete="address-level2" className="field" /></F>
        <F label="Phone you want" error={err("phoneModel")} className="sm:col-span-2">
          <input name="phoneModel" list="installment-phones" value={model} onChange={(e) => setModel(e.target.value)} required placeholder="e.g. Samsung Galaxy A55" className="field" aria-invalid={!!err("phoneModel")} />
          <datalist id="installment-phones">{phones.map((p) => <option key={p} value={p} />)}</datalist>
        </F>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">2. Appointment date</legend>
        {dates.length === 0 ? (
          <p className="text-sm text-muted">No dates open right now — please call us.</p>
        ) : (
          <DateCalendar
            dates={dates}
            value={date}
            onChange={(d) => {
              setDate(d);
              setTime("");
              setSlots(null);
            }}
          />
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">3. Time</legend>
        {slots === null ? (
          <p className="text-sm text-muted">Loading times…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">No times on this day — choose another date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Appointment time">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                role="radio"
                aria-checked={s.time === time}
                disabled={!s.available}
                onClick={() => setTime(s.time)}
                title={s.full ? "Fully booked" : !s.available ? "No longer available" : undefined}
                className={cn(
                  "rounded-xl py-2.5 text-sm ring-1 transition",
                  s.time === time ? "bg-gold font-semibold text-[#120d02] ring-gold" : s.available ? "bg-card ring-white/10 hover:ring-gold/60" : "cursor-not-allowed bg-card/40 text-white/30 line-through ring-white/5",
                )}
              >
                {timeLabel(s.time)}
                {s.full && <span className="block text-[0.65rem] no-underline">Full</span>}
              </button>
            ))}
          </div>
        )}
        {err("time") && <p className="mt-2 text-sm text-red">{err("time")}</p>}
      </fieldset>

      <F label="Anything we should know? (optional)" error={err("notes")}><textarea name="notes" rows={2} maxLength={500} className="field" /></F>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 shrink-0" />
        <span>I&apos;ll bring my <b>original CNIC</b> to the appointment. I understand the plan is confirmed after approval in store.</span>
      </label>
      {err("agree") && <p className="-mt-4 text-sm text-red">{err("agree")}</p>}

      <button disabled={busy || !time} className="btn btn-gold w-full disabled:opacity-60">{busy ? "Booking…" : time ? `Book ${timeLabel(time)} appointment` : "Choose a time to book"}</button>
    </form>
  );
}

function F({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red">{error}</span>}
    </label>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Month calendar for the appointment date (change request §4): replaces the sideways row of date cards, which
 * overflowed small screens. Dark with blue accents, gold for the chosen day; days that can't be booked are disabled.
 * Always 7 equal columns, so it fits any width. Dates are "YYYY-MM-DD" (Pakistan time), compared as plain strings.
 */
function DateCalendar({ dates, value, onChange }: { dates: string[]; value: string; onChange: (d: string) => void }) {
  const open = new Set(dates);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const monthKey = (d: string) => d.slice(0, 7);
  const [shown, setShown] = useState(() => monthKey(value || first));
  const [y, m] = shown.split("-").map(Number);
  const month = m - 1;
  const daysIn = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, month, 1)).getUTCDay() + 6) % 7; // Monday first
  const step = (n: number) => {
    const d = new Date(Date.UTC(y, month + n, 1));
    setShown(ymd(d.getUTCFullYear(), d.getUTCMonth(), 1).slice(0, 7));
  };
  const canPrev = shown > monthKey(first);
  const canNext = shown < monthKey(last);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#0b111c] p-3 ring-1 ring-blue/30 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => step(-1)} disabled={!canPrev} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-lg text-blue-soft ring-1 ring-blue/30 transition hover:bg-blue/15 disabled:pointer-events-none disabled:opacity-30">
          <Icon name="arrow-left" className="h-4 w-4" />
        </button>
        <p className="font-semibold" aria-live="polite">{MONTHS[month]} {y}</p>
        <button type="button" onClick={() => step(1)} disabled={!canNext} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-lg text-blue-soft ring-1 ring-blue/30 transition hover:bg-blue/15 disabled:pointer-events-none disabled:opacity-30">
          <Icon name="arrow-right" className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-blue-soft/80" aria-hidden>
        {WEEKDAYS.map((w) => <span key={w} className="py-1">{w.slice(0, 2)}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="radiogroup" aria-label="Appointment date">
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const d = ymd(y, month, i + 1);
          const ok = open.has(d);
          const on = d === value;
          const label = new Date(`${d}T12:00:00+05:00`).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Karachi" });
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={ok ? label : `${label} — not available`}
              disabled={!ok}
              onClick={() => onChange(d)}
              className={cn(
                "aspect-square min-w-0 rounded-lg text-sm font-semibold transition",
                on ? "bg-gold text-[#120d02] shadow-[0_6px_18px_-6px_rgb(217_166_46/0.7)]" : ok ? "bg-blue/10 text-white ring-1 ring-blue/25 hover:bg-blue/25 hover:ring-blue-soft" : "cursor-not-allowed text-white/20 line-through",
                d === today && !on && "ring-2 ring-blue-soft",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
