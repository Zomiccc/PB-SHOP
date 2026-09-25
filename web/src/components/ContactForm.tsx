"use client";

import { useState } from "react";
import { Icon } from "./ui/Icon";

type Errors = Record<string, string[] | undefined>;

export function ContactForm({ subject }: { subject?: string }) {
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setMsg(data.error);
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }
  const err = (k: string) => errors[k]?.[0];

  if (sent) {
    return (
      <div className="card grid place-items-center p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white">
          <Icon name="check" className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <h3 className="display mt-5 text-3xl">Message sent.</h3>
        <p className="mt-2 text-muted">Thanks — we&apos;ll get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-6 md:p-8">
      {msg && <p role="alert" className="rounded-xl bg-red/10 px-4 py-3 text-sm text-red">{msg}</p>}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Name" error={err("name")}><input name="name" autoComplete="name" className="field" aria-invalid={!!err("name")} /></L>
        <L label="Phone" error={err("phone")}><input name="phone" type="tel" autoComplete="tel" className="field" aria-invalid={!!err("phone")} /></L>
      </div>
      <L label="Email" error={err("email")}><input name="email" type="email" autoComplete="email" className="field" aria-invalid={!!err("email")} /></L>
      <L label="Subject" error={err("subject")}><input name="subject" defaultValue={subject} className="field" /></L>
      <L label="Message" error={err("message")}><textarea name="message" rows={5} className="field resize-y" aria-invalid={!!err("message")} /></L>
      <button disabled={busy} className="btn btn-red w-full disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}

function L({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red">{error}</span>}
    </label>
  );
}
