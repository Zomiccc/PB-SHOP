import { useId } from "react";
import { designFor } from "@/lib/phone-designs";

/**
 * Vector product art used until PB Mobiles supplies real product photography.
 * Tinted per variant colour so every listing still looks distinct and premium.
 */
export function ProductArt({
  kind,
  accessoryType,
  colorHex,
  compact = false,
  brand,
  name,
}: {
  kind: "PHONE" | "ACCESSORY" | string;
  accessoryType?: string | null;
  colorHex?: string | null;
  compact?: boolean;
  brand?: string;
  name?: string;
}) {
  const id = useId().replace(/:/g, "");
  const c = colorHex ?? "#3b4b5c";
  if (kind === "PHONE") return <PhoneArt id={id} color={c} compact={compact} brand={brand} name={name} />;
  return <AccessoryArt id={id} type={accessoryType ?? "OTHER"} color={c} />;
}

function PhoneArt({ id, color, compact, brand, name }: { id: string; color: string; compact: boolean; brand?: string; name?: string }) {
  const d = designFor(brand, name);
  // Model units → SVG: device drawn 92 wide, height from the real aspect ratio.
  const W = 92;
  const H = Math.min(190, (W * d.h) / d.w);
  const k = W / d.w;
  const R = Math.max(4, d.r * k);
  const X = (x: number) => W / 2 + x * k;
  const Y = (y: number) => H / 2 - y * k;
  const top = (240 - H) / 2;
  const frontCam =
    d.front === "island" ? <rect x={W / 2 - 13} y={9} width={26} height={7} rx={3.5} fill="#05080c" />
    : d.front === "notch" ? <rect x={W / 2 - 17} y={4} width={34} height={8} rx={4} fill="#05080c" />
    : <circle cx={d.front === "punch-left" ? 13 : W / 2} cy={11} r={3} fill="#05080c" />;
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" role="img" aria-label={`${name ?? "Phone"} illustration`}>
      <defs>
        <linearGradient id={`body-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset="0.55" stopColor={color} stopOpacity="0.88" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`screen-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#0a2c4e" />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor="#071a2b" />
        </linearGradient>
        <radialGradient id={`lens-${id}`}>
          <stop offset="0" stopColor="#3a5d86" />
          <stop offset="0.45" stopColor="#0b1622" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <clipPath id={`clip-${id}`}>
          <rect x="0" y="0" width={W} height={H} rx={R} />
        </clipPath>
        <filter id={`shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#071a2b" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* front of the device, peeking behind */}
      {!compact && (
        <g transform={`translate(30 ${top - 6}) rotate(-8 46 ${H / 2})`} filter={`url(#shadow-${id})`}>
          <rect x="0" y="0" width={W} height={H} rx={R} fill="#111820" />
          <rect x="3.5" y="3.5" width={W - 7} height={H - 7} rx={Math.max(2, R - 3)} fill={`url(#screen-${id})`} />
          {frontCam}
          <text x={W / 2} y={H * 0.3} textAnchor="middle" fontFamily="var(--font-inter-tight)" fontWeight="800" fontSize="17" fill="#fff" opacity="0.9">9:41</text>
        </g>
      )}

      {/* back of the device with this model's camera layout */}
      <g transform={compact ? `translate(54 ${top})` : `translate(82 ${top + 6}) rotate(6 46 ${H / 2})`} filter={`url(#shadow-${id})`}>
        <rect x="0" y="0" width={W} height={H} rx={R} fill={`url(#body-${id})`} />
        <rect x="0" y="0" width={W} height={H} rx={R} fill="none" stroke="#fff" strokeOpacity="0.25" />
        <g clipPath={`url(#clip-${id})`}>
          <rect x="-10" y="0" width="40" height={H} fill={`url(#sheen-${id})`} opacity="0.8" transform="skewX(-14)" />
          {d.islands.map((isl, i) => (
            <rect
              key={i}
              x={X(isl.x - isl.w / 2)}
              y={Y(isl.y + isl.h / 2)}
              width={isl.w * k}
              height={isl.h * k}
              rx={isl.r * k}
              fill={isl.tone === "dark" ? "#0d1117" : "#000"}
              fillOpacity={isl.tone === "dark" ? 0.85 : isl.tone === "body" ? 0.12 : 0.22}
              stroke="#fff"
              strokeOpacity="0.18"
            />
          ))}
        </g>
        {d.lenses.map((l, i) => (
          <circle key={i} cx={X(l.x)} cy={Y(l.y)} r={l.r * k} fill={`url(#lens-${id})`} stroke="#aab4bf" strokeWidth={d.ringed ? 2 : 1.2} />
        ))}
        {d.flash.map((f, i) => (
          <circle key={i} cx={X(f.x)} cy={Y(f.y)} r={Math.max(2, f.r * k)} fill="#f6e7b0" />
        ))}
        {d.logo === "text" && d.logoText && (
          <text x={W / 2} y={H * 0.86} textAnchor="middle" fontFamily="var(--font-mono-face)" fontSize={d.logoText.length <= 2 ? 10 : 6} letterSpacing="1.5" fill="#fff" fillOpacity="0.4">
            {d.logoText.length <= 2 ? d.logoText : d.logoText.toUpperCase()}
          </text>
        )}
      </g>
    </svg>
  );
}

function AccessoryArt({ id, type, color }: { id: string; type: string; color: string }) {
  const common = (
    <defs>
      <linearGradient id={`a-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={color} />
        <stop offset="1" stopColor="#000" stopOpacity="0.45" />
      </linearGradient>
      <filter id={`as-${id}`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#071a2b" floodOpacity="0.3" />
      </filter>
    </defs>
  );
  const f = `url(#a-${id})`;
  const s = `url(#as-${id})`;
  let body: React.ReactNode;
  switch (type) {
    case "CASE":
      body = (
        <g filter={s}>
          <rect x="60" y="30" width="84" height="170" rx="18" fill={f} fillOpacity="0.85" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
          <rect x="70" y="40" width="38" height="40" rx="10" fill="#fff" fillOpacity="0.25" />
          <circle cx="102" cy="130" r="26" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="3" />
        </g>
      );
      break;
    case "CHARGER":
      body = (
        <g filter={s}>
          <rect x="62" y="70" width="76" height="90" rx="14" fill={f} stroke="#0b1622" strokeOpacity="0.15" />
          <rect x="84" y="40" width="7" height="32" rx="2" fill="#aab4bf" />
          <rect x="109" y="40" width="7" height="32" rx="2" fill="#aab4bf" />
          <rect x="88" y="130" width="24" height="9" rx="4" fill="#0b1622" fillOpacity="0.6" />
          <path d="M104 92 94 112h10l-4 14 12-20h-10l4-14Z" fill="#0077d9" />
        </g>
      );
      break;
    case "CABLE":
      body = (
        <g filter={s} fill="none">
          <path d="M60 60c80 0 80 50 20 70s-40 70 60 60" stroke={color} strokeWidth="10" strokeLinecap="round" />
          <rect x="44" y="50" width="26" height="20" rx="5" fill="#cfd6de" />
          <rect x="136" y="180" width="26" height="20" rx="5" fill="#cfd6de" />
        </g>
      );
      break;
    case "SCREEN_PROTECTOR":
      body = (
        <g filter={s}>
          <rect x="66" y="30" width="80" height="170" rx="16" fill="#0b1622" fillOpacity="0.1" />
          <rect x="56" y="40" width="80" height="170" rx="16" fill={f} fillOpacity="0.55" stroke="#fff" strokeWidth="2" />
          <path d="M70 70 120 55M70 100 128 80" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
      break;
    case "POWER_BANK":
      body = (
        <g filter={s}>
          <rect x="56" y="44" width="92" height="150" rx="18" fill={f} />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={82 + i * 13} cy="170" r="3.5" fill={i < 3 ? "#d9a62e" : "#fff"} fillOpacity={i < 3 ? 1 : 0.3} />
          ))}
          <path d="M106 90 94 114h12l-5 18 15-26h-12l5-16Z" fill="#fff" fillOpacity="0.8" />
        </g>
      );
      break;
    case "EARBUDS":
      body = (
        <g filter={s}>
          <rect x="52" y="104" width="96" height="76" rx="30" fill={f} stroke="#0b1622" strokeOpacity="0.1" />
          <line x1="52" y1="130" x2="148" y2="130" stroke="#0b1622" strokeOpacity="0.15" />
          <ellipse cx="82" cy="72" rx="16" ry="20" fill="#fff" stroke="#0b1622" strokeOpacity="0.1" />
          <rect x="76" y="80" width="10" height="36" rx="5" fill="#fff" />
          <ellipse cx="120" cy="72" rx="16" ry="20" fill="#fff" stroke="#0b1622" strokeOpacity="0.1" />
          <rect x="116" y="80" width="10" height="36" rx="5" fill="#fff" />
          <circle cx="100" cy="150" r="3" fill="#0077d9" />
        </g>
      );
      break;
    default:
      body = <rect x="60" y="60" width="80" height="120" rx="16" fill={f} filter={s} />;
  }
  return (
    <svg viewBox="0 0 200 240" className="h-full w-full" role="img" aria-label="Accessory illustration">
      {common}
      {body}
    </svg>
  );
}
