"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * "Scan" button: opens the camera and reads the barcode on a phone box (IMEI). Uses the browser's barcode reader
 * (Chrome on Android); a USB / Bluetooth scanner also works by scanning straight into the field.
 */
export function ScanButton({ onScan, label = "Scan IMEI" }: { onScan: (code: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      const BD = (window as unknown as { BarcodeDetector?: new (o?: object) => Detector }).BarcodeDetector;
      if (!BD) return setError("This browser can't read barcodes — use Chrome on Android, or type / scan the IMEI into the box.");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new BD({ formats: ["code_128", "ean_13", "code_39", "qr_code", "upc_a", "itf"] });
        while (!stop) {
          const found = await detector.detect(video.current).catch(() => []);
          // An IMEI is 15 digits; boxes often show IMEI 1 first.
          const code = found.map((f) => f.rawValue.replace(/\s/g, "")).find((c) => /^\d{14,17}$/.test(c)) ?? found[0]?.rawValue;
          if (code) {
            onScan(code.trim());
            setOpen(false);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setError("Camera not available — allow camera access, or type the IMEI.");
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onScan]);

  return (
    <>
      <button type="button" onClick={() => { setError(""); setOpen(true); }} className="btn btn-ghost !py-2 !text-sm">{label}</button>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-navy-950/80 p-4" role="dialog" aria-label="Scan barcode">
          <div className="w-full max-w-sm rounded-2xl bg-card p-4">
            {error ? <p className="text-sm text-red">{error}</p> : <video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-xl bg-black object-cover" />}
            <p className="mt-2 text-xs text-muted">Point the camera at the IMEI barcode on the box.</p>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost mt-3 w-full">Close</button>
          </div>
        </div>
      )}
    </>
  );
}
