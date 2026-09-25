"use client";

import { useState } from "react";

/**
 * Single-series column chart: ≤24px columns with 4px rounded caps on a shared baseline,
 * hairline grid, clean ticks, hover tooltip and a table view (dataviz spec).
 * Colour is brand electric blue; text stays in ink tokens.
 */
const FORMATS = {
  count: (n: number) => n.toLocaleString("en-PK"),
  thousands: (n: number) => (n >= 1000 ? `${Math.round(n / 1000).toLocaleString("en-PK")}k` : String(n)),
};

export function BarChart({ data, unit = "count", height = 220, label }: { data: { label: string; value: number }[]; unit?: keyof typeof FORMATS; height?: number; label: string }) {
  const format = FORMATS[unit];
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const padL = 64;
  const padB = 28;
  const W = Math.max(320, data.length * 36 + padL);
  const H = height;
  const band = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(24, band * 0.6);
  const y = (v: number) => H - padB - (v / top) * (H - padB - 12);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button onClick={() => setTable((t) => !t)} className="text-xs text-blue hover:underline">
          {table ? "Show chart" : "Show table"}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted"><th className="py-1">Period</th><th className="py-1 text-right">{label}</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-ink/5"><td className="py-1.5">{d.label}</td><td className="py-1.5 text-right font-medium">{format(d.value)}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 640) }} role="img" aria-label={`${label} chart`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="#e7e4dc" strokeWidth={1} />
                <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="#5b6776">{format(t)}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = padL + band * i + band / 2;
              const h = Math.max(0, H - padB - y(d.value));
              const r = Math.min(4, h);
              const x = cx - bw / 2;
              const yt = y(d.value);
              return (
                <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <rect x={cx - band / 2} y={0} width={band} height={H - padB} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={`M${x},${H - padB} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + bw - r} Q${x + bw},${yt} ${x + bw},${yt + r} V${H - padB} Z`}
                      fill="#0077d9"
                      opacity={hover == null || hover === i ? 1 : 0.45}
                    />
                  )}
                  {(data.length <= 14 || i % Math.ceil(data.length / 14) === 0) && (
                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#5b6776">{d.label}</text>
                  )}
                </g>
              );
            })}
            <line x1={padL} x2={W} y1={H - padB} y2={H - padB} stroke="#cfcac0" strokeWidth={1} />
          </svg>
          {hover != null && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-navy-950 px-2.5 py-1.5 text-xs text-white shadow-lg"
              style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}
            >
              <b>{format(data[hover].value)}</b> · {data[hover].label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
