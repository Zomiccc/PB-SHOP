"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { REPAIR_STATUSES } from "@/lib/constants";
import { cn, pkr } from "@/lib/format";
import { Icon } from "../ui/Icon";

type Result = { ref: string; device: string; status: string; quote: number | null; history: { to: string; at: string }[] };

export function TrackRepair({ initialRef }: { initialRef: string }) {
  const [ref, setRef] = useState(initialRef);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/repairs/track?${new URLSearchParams({ ref, phone })}`);
      const data = await res.json();
      if (!res.ok) {
        setResult(null);
        setError(data.error);
      } else setResult(data);
    } finally {
      setBusy(false);
    }
  }

  const idx = result ? REPAIR_STATUSES.findIndex((s) => s.key === result.status) : -1;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <form onSubmit={lookup} className="card h-fit space-y-4 p-6 md:p-8">
        <div>
          <label htmlFor="t-ref" className="label">Repair reference</label>
          <input id="t-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PBR-1042" required className="field uppercase" />
        </div>
        <div>
          <label htmlFor="t-phone" className="label">Mobile number</label>
          <input id="t-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 1234567" required className="field" />
        </div>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Checking…" : "Check status"}</button>
      </form>

      {result ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-navy-950 p-6 text-white md:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">{result.ref}</p>
          <h2 className="display mt-2 text-3xl">{result.device}</h2>
          {result.quote != null && <p className="mt-2 text-white/70">Quoted: {pkr(result.quote)}</p>}
          <ol className="mt-8 space-y-0">
            {REPAIR_STATUSES.map((s, i) => {
              const reached = i <= idx;
              const at = result.history.findLast((h) => h.to === s.key)?.at;
              return (
                <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < REPAIR_STATUSES.length - 1 && <span className={cn("absolute left-[11px] top-6 h-full w-px", i < idx ? "bg-gold" : "bg-white/15")} />}
                  <span className={cn("relative grid h-6 w-6 shrink-0 place-items-center rounded-full", reached ? "bg-gold text-navy-950" : "border border-white/25")}>
                    {reached && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <div>
                    <p className={cn("font-medium", i === idx ? "text-gold" : reached ? "text-white" : "text-white/40")}>{s.label}</p>
                    {at && <p className="text-xs text-white/50">{new Date(at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {result.status === "CANCELLED" && <p className="mt-6 rounded-xl bg-red/20 p-3 text-sm">This repair was cancelled. Contact us if you have questions.</p>}
        </motion.div>
      ) : (
        <div className="grid place-items-center rounded-3xl border-2 border-dashed border-ink/10 p-10 text-center text-muted">
          <div>
            <Icon name="wrench" className="mx-auto h-8 w-8" />
            <p className="mt-3">Your repair timeline will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
