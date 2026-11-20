/**
 * 3D-style category icons (client request, Nov 2026: matching 3D icons instead of photos on the category cards;
 * Custom Skins keeps its own art). One consistent "soft 3D" look: glossy gradients lit from the top-left, a
 * darker side for depth, a white specular highlight and a soft floor shadow. Pure SVG, so they stay sharp and light.
 */

type P = { className?: string };
const box = "0 0 200 160";

function Floor({ id, cx = 100, w = 62 }: { id: string; cx?: number; w?: number }) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-floor`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#000" stopOpacity=".55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy="146" rx={w} ry="9" fill={`url(#${id}-floor)`} />
    </>
  );
}

/** A phone in 3/4 view: metal frame, thickness on the right, glossy screen. */
function Phone({ id, screen, frame, x = 0, y = 0, rotate = -10 }: { id: string; screen: [string, string, string]; frame: [string, string]; x?: number; y?: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} 100 80)`}>
      <defs>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={frame[0]} />
          <stop offset="1" stopColor={frame[1]} />
        </linearGradient>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={screen[0]} />
          <stop offset=".55" stopColor={screen[1]} />
          <stop offset="1" stopColor={screen[2]} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* thickness */}
      <rect x="74" y="20" width="62" height="122" rx="15" fill={frame[1]} />
      <rect x="68" y="16" width="62" height="122" rx="15" fill={`url(#${id}-frame)`} />
      <rect x="72.5" y="21" width="53" height="112" rx="11" fill="#05070b" />
      <rect x="75" y="24" width="48" height="106" rx="9" fill={`url(#${id}-screen)`} />
      {/* wallpaper waves */}
      <path d="M75 92 C 92 78, 104 104, 123 86 L123 121 Q123 130 114 130 L84 130 Q75 130 75 121 Z" fill="#fff" opacity=".18" />
      <path d="M75 108 C 94 96, 106 120, 123 104 L123 121 Q123 130 114 130 L84 130 Q75 130 75 121 Z" fill="#fff" opacity=".14" />
      {/* camera punch-hole + specular glare */}
      <circle cx="99" cy="30" r="2.4" fill="#05070b" />
      <path d="M79 26 L97 26 L79 74 Z" fill={`url(#${id}-gloss)`} opacity=".5" />
      <rect x="69.5" y="17.5" width="59" height="119" rx="14" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
    </g>
  );
}

function Badge({ id, cx, cy, r = 17, colors, children }: { id: string; cx: number; cy: number; r?: number; colors: [string, string]; children: React.ReactNode }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${id}-badge`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </radialGradient>
      </defs>
      <circle cx={cx + 2} cy={cy + 3} r={r} fill="#000" opacity=".35" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-badge)`} />
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.45} rx={r * 0.5} ry={r * 0.25} fill="#fff" opacity=".45" />
      {children}
    </g>
  );
}

const Sparkle = ({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -12 C 2 -3, 3 -2, 12 0 C 3 2, 2 3, 0 12 C -2 3, -3 2, -12 0 C -3 -2, -2 -3, 0 -12 Z" fill={fill} />
);

export function NewPhoneIcon({ className }: P) {
  return (
    <svg viewBox={box} className={className} aria-hidden>
      <defs>
        <linearGradient id="ci-new-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#d9a62e" />
        </linearGradient>
      </defs>
      <Floor id="ci-new" />
      <Phone id="ci-new" screen={["#5b8cff", "#7b5cff", "#ff5fa2"]} frame={["#eef1f6", "#9aa3b2"]} />
      <Sparkle x={146} y={34} s={1.15} fill="url(#ci-new-spark)" />
      <Sparkle x={58} y={48} s={0.6} fill="url(#ci-new-spark)" />
      <Sparkle x={150} y={70} s={0.45} fill="url(#ci-new-spark)" />
    </svg>
  );
}

export function UsedPhoneIcon({ className }: P) {
  return (
    <svg viewBox={box} className={className} aria-hidden>
      <Floor id="ci-used" />
      <Phone id="ci-used" screen={["#1d3b5c", "#2b6a8f", "#3fb3a8"]} frame={["#6b7380", "#2a2f38"]} x={-8} />
      <Badge id="ci-used" cx={136} cy={108} r={21} colors={["#5ee39a", "#0f9d58"]}>
        <path d="M126 108 l7 7 l13 -14" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </Badge>
    </svg>
  );
}

export function TabletIcon({ className }: P) {
  return (
    <svg viewBox={box} className={className} aria-hidden>
      <defs>
        <linearGradient id="ci-tab-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9edf3" />
          <stop offset="1" stopColor="#8e97a6" />
        </linearGradient>
        <linearGradient id="ci-tab-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fd0ff" />
          <stop offset=".5" stopColor="#3a7bff" />
          <stop offset="1" stopColor="#8a5cff" />
        </linearGradient>
        <linearGradient id="ci-tab-gloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ci-tab-pen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9c0cc" />
        </linearGradient>
      </defs>
      <Floor id="ci-tab" w={72} />
      <g transform="rotate(-8 100 80)">
        <rect x="45" y="30" width="120" height="96" rx="13" fill="#7d8695" />
        <rect x="38" y="25" width="120" height="96" rx="13" fill="url(#ci-tab-frame)" />
        <rect x="43" y="30" width="110" height="86" rx="9" fill="#05070b" />
        <rect x="46" y="33" width="104" height="80" rx="7" fill="url(#ci-tab-screen)" />
        <path d="M46 86 C 72 70, 96 100, 150 76 L150 106 Q150 113 143 113 L53 113 Q46 113 46 106 Z" fill="#fff" opacity=".18" />
        <path d="M50 35 L86 35 L50 82 Z" fill="url(#ci-tab-gloss)" opacity=".55" />
        <rect x="39.5" y="26.5" width="117" height="93" rx="12" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" />
      </g>
      <g transform="rotate(38 150 100)">
        <rect x="146" y="58" width="9" height="74" rx="4.5" fill="url(#ci-tab-pen)" />
        <path d="M146 132 L150.5 142 L155 132 Z" fill="#9aa3b2" />
      </g>
    </svg>
  );
}

export function RepairIcon({ className }: P) {
  return (
    <svg viewBox={box} className={className} aria-hidden>
      <defs>
        <linearGradient id="ci-rep-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset=".45" stopColor="#e6b84a" />
          <stop offset="1" stopColor="#9a6a12" />
        </linearGradient>
        <linearGradient id="ci-rep-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7b7f" />
          <stop offset="1" stopColor="#b5121b" />
        </linearGradient>
        <linearGradient id="ci-rep-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3f5f8" />
          <stop offset="1" stopColor="#8b94a3" />
        </linearGradient>
      </defs>
      <Floor id="ci-rep" w={66} />
      {/* screwdriver */}
      <g transform="rotate(42 100 80)">
        <rect x="95" y="20" width="10" height="64" rx="3" fill="url(#ci-rep-steel)" />
        <path d="M95 20 L100 8 L105 20 Z" fill="#c9ced8" />
        <rect x="86" y="80" width="28" height="58" rx="12" fill="#7a0d12" transform="translate(3 3)" />
        <rect x="86" y="80" width="28" height="58" rx="12" fill="url(#ci-rep-red)" />
        <rect x="91" y="86" width="5" height="46" rx="2.5" fill="#fff" opacity=".35" />
      </g>
      {/* wrench */}
      <g transform="rotate(-42 100 80)">
        <path d="M93 44 L107 44 L107 124 Q107 132 100 132 Q93 132 93 124 Z" fill="#7a5410" transform="translate(3 3)" />
        <path d="M93 44 L107 44 L107 124 Q107 132 100 132 Q93 132 93 124 Z" fill="url(#ci-rep-gold)" />
        <path d="M100 12 a 22 22 0 1 0 0.1 0 Z M92 14 L92 36 L108 36 L108 14 Z" fill="url(#ci-rep-gold)" fillRule="evenodd" transform="translate(0 6)" />
        <rect x="96" y="54" width="4" height="66" rx="2" fill="#fff" opacity=".45" />
      </g>
    </svg>
  );
}

export function AccessoriesIcon({ className }: P) {
  return (
    <svg viewBox={box} className={className} aria-hidden>
      <defs>
        <linearGradient id="ci-acc-case" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c7ccd6" />
        </linearGradient>
        <linearGradient id="ci-acc-bud" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#aeb5c2" />
        </linearGradient>
        <radialGradient id="ci-acc-tip" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#5d6573" />
          <stop offset="1" stopColor="#1b1f27" />
        </radialGradient>
      </defs>
      <Floor id="ci-acc" w={70} />
      {/* charging case */}
      <rect x="62" y="70" width="76" height="66" rx="30" fill="#8d94a1" transform="translate(4 4)" />
      <rect x="62" y="70" width="76" height="66" rx="30" fill="url(#ci-acc-case)" />
      <path d="M64 96 Q100 102 136 96" fill="none" stroke="#9aa1ad" strokeWidth="2" />
      <circle cx="100" cy="112" r="2.6" fill="#3ddc84" />
      <ellipse cx="82" cy="80" rx="16" ry="5" fill="#fff" opacity=".8" />
      {/* two earbuds floating above */}
      {[
        { x: 70, r: -18 },
        { x: 122, r: 18 },
      ].map((b) => (
        <g key={b.x} transform={`rotate(${b.r} ${b.x} 46)`}>
          <rect x={b.x - 5} y="42" width="10" height="34" rx="5" fill="url(#ci-acc-bud)" />
          <ellipse cx={b.x} cy="40" rx="14" ry="13" fill="url(#ci-acc-bud)" />
          <ellipse cx={b.x + (b.r < 0 ? 7 : -7)} cy="38" rx="6" ry="5.5" fill="url(#ci-acc-tip)" />
          <ellipse cx={b.x - 4} cy="34" rx="5" ry="3" fill="#fff" opacity=".9" />
        </g>
      ))}
    </svg>
  );
}

export function InstallmentsIcon({ className }: P) {
  return (
    <svg viewBox={box} className={className} aria-hidden>
      <defs>
        <linearGradient id="ci-ins-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset=".6" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0b2a7a" />
        </linearGradient>
        <linearGradient id="ci-ins-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset="1" stopColor="#c99a2e" />
        </linearGradient>
        <linearGradient id="ci-ins-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#c08a1e" />
        </linearGradient>
        <linearGradient id="ci-ins-coinside" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a26f12" />
          <stop offset=".5" stopColor="#e2b04a" />
          <stop offset="1" stopColor="#8a5c0c" />
        </linearGradient>
      </defs>
      <Floor id="ci-ins" w={74} />
      <g transform="rotate(-12 90 80)">
        <rect x="34" y="40" width="112" height="72" rx="11" fill="#071a52" transform="translate(5 5)" />
        <rect x="34" y="40" width="112" height="72" rx="11" fill="url(#ci-ins-card)" />
        <rect x="34" y="56" width="112" height="12" fill="#06143f" opacity=".55" />
        <rect x="46" y="78" width="20" height="15" rx="3" fill="url(#ci-ins-chip)" />
        <rect x="74" y="96" width="44" height="5" rx="2.5" fill="#fff" opacity=".55" />
        <path d="M38 44 L96 44 L38 92 Z" fill="#fff" opacity=".12" />
      </g>
      {/* coin stack */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${-i * 11})`}>
          <path d="M126 128 L126 120 A 22 8 0 0 1 170 120 L170 128 A 22 8 0 0 1 126 128 Z" fill="url(#ci-ins-coinside)" />
          <ellipse cx="148" cy="120" rx="22" ry="8" fill="url(#ci-ins-coin)" />
        </g>
      ))}
      <text x="148" y="101.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#8a5c0c" fontFamily="Arial, sans-serif">Rs</text>
      <ellipse cx="141" cy="96" rx="7" ry="2" fill="#fff" opacity=".7" />
    </svg>
  );
}
