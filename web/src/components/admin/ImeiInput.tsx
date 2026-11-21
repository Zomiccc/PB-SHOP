"use client";

import { useState } from "react";
import { ScanButton } from "@/components/admin/ScanButton";

/** IMEI box with a "Scan" button that reads the barcode on the phone box (Part 2: new phone purchase). */
export function ImeiInput({ required }: { required?: boolean }) {
  const [imei, setImei] = useState("");
  return (
    <span className="flex gap-2">
      <input name="imei" value={imei} onChange={(e) => setImei(e.target.value)} required={required} inputMode="numeric" autoComplete="off" className="field font-mono" />
      <ScanButton onScan={(c) => setImei(c.replace(/\s/g, ""))} label="Scan" />
    </span>
  );
}
