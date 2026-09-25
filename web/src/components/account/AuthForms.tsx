"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";

type Errors = Record<string, string[] | undefined>;

export function AuthForms() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [needsProof, setNeedsProof] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, action: tab }) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setMsg(data.error);
        if (data.needsProof) setNeedsProof(true);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k]?.[0];

  return (
    <div className="card w-full max-w-md p-6 md:p-8">
      <div className="grid grid-cols-2 rounded-full bg-cream p-1" role="tablist">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setErrors({});
              setMsg(null);
            }}
            className={cn("rounded-full py-2.5 text-sm font-semibold transition", tab === t ? "bg-navy-950 text-white" : "text-muted")}
          >
            {t === "login" ? "Log in" : "Create Passport"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {msg && <p role="alert" className="rounded-xl bg-red/10 px-4 py-3 text-sm text-red">{msg}</p>}
        {tab === "register" && (
          <F label="Full name" error={err("name")}>
            <input name="name" autoComplete="name" className="field" aria-invalid={!!err("name")} />
          </F>
        )}
        <F label="Mobile number" error={err("phone")}>
          <input name="phone" type="tel" autoComplete="tel" placeholder="0300 1234567" className="field" aria-invalid={!!err("phone")} />
        </F>
        {tab === "register" && (
          <F label="Email (optional)" error={err("email")}>
            <input name="email" type="email" autoComplete="email" className="field" aria-invalid={!!err("email")} />
          </F>
        )}
        <F label="Password" error={err("password")}>
          <input name="password" type="password" autoComplete={tab === "login" ? "current-password" : "new-password"} className="field" aria-invalid={!!err("password")} />
        </F>
        {tab === "register" && needsProof && (
          <F label="Past order number or repair reference" error={err("proof")}>
            <input name="proof" placeholder="PB-100001 or PBR-1001" className="field uppercase" aria-invalid={!!err("proof")} />
          </F>
        )}
        <button disabled={busy} className="btn btn-red w-full disabled:opacity-60">
          {busy ? "Please wait…" : tab === "login" ? "Log in" : "Create my Passport"}
        </button>
        {tab === "register" && <p className="text-center text-xs text-muted">Already bought or repaired with us? Use the same number and we&apos;ll link your history.</p>}
      </form>
    </div>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-sm text-red">{error}</span>}
    </label>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
        router.refresh();
      }}
      className="btn btn-ghost-light !py-2.5 !text-sm"
    >
      Log out
    </button>
  );
}
