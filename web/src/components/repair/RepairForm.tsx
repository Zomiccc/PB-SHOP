"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DROP_OFF, PHONE_BRANDS, REPAIR_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

type Errors = Record<string, string[] | undefined>;

export function RepairForm({ defaults }: { defaults: { device?: string; issue?: string; name?: string; phone?: string; email?: string } }) {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dropOff, setDropOff] = useState("WALK_IN");
  const fileRef = useRef<HTMLInputElement>(null);

  const guessedBrand = PHONE_BRANDS.find((b) => defaults.device?.toLowerCase().includes(b.toLowerCase())) ?? (defaults.device?.toLowerCase().includes("iphone") ? "Apple" : "");
  const guessedModel = defaults.device?.replace(new RegExp(guessedBrand, "i"), "").trim() ?? "";

  const err = (k: string) => errors[k]?.[0];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});
    try {
      const res = await fetch("/api/repairs", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Something went wrong");
        const first = Object.keys(data.fields ?? {})[0];
        if (first) document.getElementById(`rf-${first}`)?.focus();
        return;
      }
      setDone(data.ref);
      window.scrollTo({ top: (document.getElementById("form")?.offsetTop ?? 0) - 100, behavior: "smooth" });
    } catch {
      setFormError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] bg-navy-950 p-8 text-white md:p-12">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gold text-navy-950">
          <Icon name="check" className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <h3 className="display mt-6 text-4xl md:text-5xl">Visit note created.</h3>
        <p className="mt-3 text-white/70">Your repair reference is</p>
        <p className="display mt-2 text-5xl text-gold md:text-6xl">{done}</p>
        <ol className="mt-8 space-y-3 text-sm text-white/80">
          <li className="flex gap-3"><span className="text-gold">01</span> Keep this reference — we&apos;ll use it on WhatsApp/SMS updates.</li>
          <li className="flex gap-3"><span className="text-gold">02</span> Bring your phone in (or wait for pickup if requested). We&apos;ll diagnose it and confirm the price before any work.</li>
          <li className="flex gap-3"><span className="text-gold">03</span> Track progress any time with your reference and phone number.</li>
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/repair/track?ref=${done}`} className="btn btn-gold">Track this repair</Link>
          <button onClick={() => setDone(null)} className="btn btn-ghost-light">Book another</button>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[1.75rem] bg-card p-6 shadow-[var(--shadow-card)] md:p-10">
      <AnimatePresence>
        {formError && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} role="alert" className="mb-6 rounded-xl bg-red/10 px-4 py-3 text-sm text-red">
            {formError}
          </motion.p>
        )}
      </AnimatePresence>

      <Section n="01" title="Your details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Full name" error={err("name")}>
            <input id="rf-name" name="name" defaultValue={defaults.name} autoComplete="name" required className="field" aria-invalid={!!err("name")} />
          </Field>
          <Field id="phone" label="Mobile number" error={err("phone")}>
            <input id="rf-phone" name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" placeholder="0300 1234567" required className="field" aria-invalid={!!err("phone")} />
          </Field>
          <Field id="email" label="Email (optional)" error={err("email")} className="sm:col-span-2">
            <input id="rf-email" name="email" type="email" defaultValue={defaults.email} autoComplete="email" className="field" aria-invalid={!!err("email")} />
          </Field>
        </div>
      </Section>

      <Section n="02" title="Your device">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="brand" label="Phone brand" error={err("brand")}>
            <select id="rf-brand" name="brand" defaultValue={guessedBrand} required className="field" aria-invalid={!!err("brand")}>
              <option value="">Choose brand</option>
              {PHONE_BRANDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field id="model" label="Model" error={err("model")}>
            <input id="rf-model" name="model" defaultValue={guessedModel || defaults.device} placeholder="e.g. iPhone 13 / Galaxy A54" required className="field" aria-invalid={!!err("model")} />
          </Field>
          <Field id="imei" label="IMEI / serial (optional)" error={err("imei")} className="sm:col-span-2">
            <input id="rf-imei" name="imei" inputMode="numeric" placeholder="Dial *#06# to see your IMEI" className="field" aria-invalid={!!err("imei")} />
          </Field>
        </div>
      </Section>

      <Section n="03" title="What's wrong?">
        <fieldset>
          <legend className="sr-only">Repair type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(REPAIR_CATEGORIES).map(([k, v]) => (
              <label key={k} className="cursor-pointer">
                <input type="radio" name="category" value={k} defaultChecked={defaults.issue === k} className="peer sr-only" />
                <span className="flex h-full items-center rounded-xl border border-ink/15 px-3 py-3 text-sm transition peer-checked:border-navy-950 peer-checked:bg-navy-950 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue hover:border-ink/40">
                  {v}
                </span>
              </label>
            ))}
          </div>
          {err("category") && <p id="rf-category" tabIndex={-1} className="mt-2 text-sm text-red">{err("category")}</p>}
        </fieldset>
        <Field id="description" label="Describe the problem" error={err("description")} className="mt-4">
          <textarea
            id="rf-description"
            name="description"
            rows={4}
            required
            placeholder="What happened, when it started, anything you've already tried…"
            className="field resize-y"
            aria-invalid={!!err("description")}
          />
        </Field>
        <div className="mt-4">
          <span className="label">Photos (optional, up to 4)</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink/15 px-4 py-6 text-sm text-muted transition hover:border-blue hover:text-blue"
          >
            <Icon name="upload" className="h-5 w-5" /> Add photos of the damage
          </button>
          <input
            ref={fileRef}
            id="rf-photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(0, 4);
              setPreviews(files.map((f) => URL.createObjectURL(f)));
            }}
          />
          {previews.length > 0 && (
            <div className="mt-3 flex gap-2">
              {previews.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={p} alt="Selected photo preview" className="h-20 w-20 rounded-lg object-cover" />
              ))}
            </div>
          )}
          {err("photos") && <p className="mt-2 text-sm text-red">{err("photos")}</p>}
        </div>
      </Section>

      <Section n="04" title="Drop-off" last>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(DROP_OFF).map(([k, v]) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="dropOff" value={k} checked={dropOff === k} onChange={() => setDropOff(k)} className="peer sr-only" />
              <span className="block h-full rounded-xl border border-ink/15 p-3 text-sm transition peer-checked:border-blue peer-checked:bg-blue/5 peer-checked:ring-1 peer-checked:ring-blue peer-focus-visible:ring-2">
                {v}
              </span>
            </label>
          ))}
        </div>
        <AnimatePresence>
          {dropOff !== "WALK_IN" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Field id="preferredAt" label={dropOff === "PICKUP" ? "Preferred pickup time" : "Preferred appointment time"} error={err("preferredAt")} className="mt-4">
                <input id="rf-preferredAt" name="preferredAt" type="datetime-local" className="field" aria-invalid={!!err("preferredAt")} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <label className="mt-6 flex items-start gap-3 text-sm">
        <input id="rf-agree" type="checkbox" name="agree" className="mt-0.5 h-4 w-4 accent-[var(--color-blue)]" aria-invalid={!!err("agree")} />
        <span>
          I agree to the <Link href="/terms#repairs" className="text-blue underline">repair terms</Link>, including diagnosis before quoting and backing up my data where possible.
          {err("agree") && <span className="block text-red">{err("agree")}</span>}
        </span>
      </label>

      <button disabled={busy} className="btn btn-red mt-8 w-full justify-between !py-4 disabled:opacity-60">
        {busy ? "Creating your visit note…" : "Create my visit note"}
        <Icon name="arrow-up-right" className="h-4 w-4" />
      </button>
    </form>
  );
}

function Section({ n, title, children, last }: { n: string; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-[160px_1fr]", !last && "mb-8 border-b border-ink/10 pb-8")}>
      <div>
        <p className="font-mono text-xs text-red">{n}</p>
        <p className="mt-1 font-semibold">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={`rf-${id}`} className="label">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-red">{error}</p>}
    </div>
  );
}
