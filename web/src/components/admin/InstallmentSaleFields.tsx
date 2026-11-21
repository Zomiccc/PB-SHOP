"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/admin/Primitives";
import { ScanButton } from "@/components/admin/ScanButton";

type Model = { model: string; price: number };

/** Phone model, retail price, IMEI and CNIC for an installment sale: picking a model or scanning an IMEI fills the price. */
export function InstallmentSaleFields({ models }: { models: Model[] }) {
  const [model, setModel] = useState("");
  const [price, setPrice] = useState("");
  const [imei, setImei] = useState("");
  const [note, setNote] = useState("");

  const pickModel = (m: string) => {
    setModel(m);
    const hit = models.find((x) => x.model.toLowerCase() === m.trim().toLowerCase());
    if (hit) setPrice(String(hit.price));
  };

  const lookup = useCallback(async (code: string) => {
    const clean = code.replace(/\s/g, "");
    setImei(clean);
    if (clean.length < 6) return;
    const r = await fetch(`/api/admin/pos/lookup?code=${encodeURIComponent(clean)}`);
    if (!r.ok) return setNote("IMEI not in stock — type the model and price.");
    const item = (await r.json()) as { name: string; detail: string; price: number };
    setModel([item.name, item.detail].filter(Boolean).join(" · "));
    setPrice(String(item.price));
    setNote(`Found in stock: ${item.name}`);
  }, []);

  return (
    <>
      <Field label="IMEI" hint="Scan the box, or type it — a phone in stock fills the model and price">
        <div className="flex gap-2">
          <input name="imei" value={imei} onChange={(e) => setImei(e.target.value)} onBlur={(e) => e.target.value && !model && lookup(e.target.value)} inputMode="numeric" autoComplete="off" className="field !py-3.5 font-mono text-base" />
          <ScanButton onScan={lookup} label="Scan" />
        </div>
        {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
      </Field>
      <Field label="Phone model" hint="Start typing to pick a phone from the installment list">
        <input name="phoneModel" list="installment-models" value={model} onChange={(e) => pickModel(e.target.value)} required autoComplete="off" placeholder="Infinix NOTE 60 · 8GB / 256GB" className="field !py-3.5 text-base" />
        <datalist id="installment-models">{models.map((l) => <option key={l.model} value={l.model} />)}</datalist>
      </Field>
      <Field label="Phone retail price (Rs)" hint="Fills in from the new-phone price when you pick a model">
        <input name="phoneValue" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="field !py-3.5 text-base" />
      </Field>
    </>
  );
}
