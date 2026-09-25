"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn btn-primary !py-2 !text-sm">
      {label}
    </button>
  );
}
