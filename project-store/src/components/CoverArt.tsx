import type { ReactNode } from "react";
import { CategoryIcon } from "./Icons";

/**
 * Artwork for a project, drawn on the server from its domain: circuit traces for IoT, a neural
 * network for AI, gears for fabrication… Each project gets its own variation (seeded by its
 * address), so the catalogue looks varied without any image files.
 */

const W = 320;
const H = 170;
const ink = (o: number) => `rgb(255 255 255 / ${o.toFixed(2)})`;

function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

type R = () => number;

function code(r: R) {
  const out: ReactNode[] = [];
  let indent = 0;
  for (let i = 0; i < 9; i++) {
    indent = Math.max(0, Math.min(3, indent + (r() < 0.4 ? 1 : r() < 0.5 ? -1 : 0)));
    const x = 16 + indent * 16;
    const w1 = 24 + r() * 60;
    const w2 = 20 + r() * 80;
    out.push(<rect key={`a${i}`} x={x} y={14 + i * 17} width={w1} height={6} rx={3} fill={ink(0.32)} />);
    out.push(<rect key={`b${i}`} x={x + w1 + 8} y={14 + i * 17} width={w2} height={6} rx={3} fill={ink(0.14 + r() * 0.12)} />);
  }
  return out;
}

function neural(r: R) {
  const layers = [4, 5, 5, 3];
  const xs = [40, 110, 180, 250];
  const pts = layers.map((n, li) => Array.from({ length: n }, (_, i) => ({ x: xs[li] + r() * 8, y: ((i + 1) * H) / (n + 1) + (r() - 0.5) * 10 })));
  const out: ReactNode[] = [];
  for (let l = 0; l < pts.length - 1; l++)
    for (const a of pts[l]) for (const b of pts[l + 1]) out.push(<line key={`${l}${a.y}${b.y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ink(0.05 + r() * 0.16)} strokeWidth={1} />);
  pts.flat().forEach((p, i) => {
    out.push(<circle key={`n${i}`} cx={p.x} cy={p.y} r={5 + r() * 2} fill={ink(0.55)} />);
    if (r() < 0.3) out.push(<circle key={`g${i}`} cx={p.x} cy={p.y} r={13} fill={ink(0.12)} />);
  });
  return out;
}

function hexes(r: R) {
  const out: ReactNode[] = [];
  const s = 17;
  const hw = Math.sqrt(3) * s;
  for (let row = -1; row < 8; row++)
    for (let col = -1; col < 11; col++) {
      const cx = col * hw + (row % 2 ? hw / 2 : 0);
      const cy = row * s * 1.5;
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        return `${(cx + s * Math.cos(a)).toFixed(1)},${(cy + s * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      const lit = r() < 0.12;
      out.push(<polygon key={`${row}-${col}`} points={pts} fill={lit ? ink(0.2) : "none"} stroke={ink(lit ? 0.45 : 0.13)} strokeWidth={1.2} />);
    }
  return out;
}

function circuit(r: R) {
  const out: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    let x = Math.round(r() * W);
    let y = Math.round(r() * H);
    let d = `M${x} ${y}`;
    for (let s = 0; s < 3; s++) {
      if (s % 2 === 0) x = Math.max(8, Math.min(W - 8, x + (r() - 0.5) * 160));
      else y = Math.max(8, Math.min(H - 8, y + (r() - 0.5) * 110));
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    out.push(<path key={`p${i}`} d={d} fill="none" stroke={ink(0.28)} strokeWidth={2} strokeLinejoin="round" />);
    out.push(<circle key={`c${i}`} cx={x} cy={y} r={4.5} fill="none" stroke={ink(0.6)} strokeWidth={2} />);
  }
  for (let i = 0; i < 6; i++) out.push(<rect key={`r${i}`} x={r() * W} y={r() * H} width={14} height={8} rx={2} fill={ink(0.3)} />);
  return out;
}

function waves(r: R) {
  const out: ReactNode[] = [];
  for (let k = 0; k < 4; k++) {
    const amp = 12 + r() * 26;
    const len = 60 + r() * 70;
    const ph = r() * 6;
    const mid = 30 + k * 36 + r() * 10;
    let d = "";
    for (let x = 0; x <= W; x += 6) d += `${x === 0 ? "M" : "L"}${x} ${(mid + amp * Math.sin(x / len * 2 * Math.PI + ph)).toFixed(1)} `;
    out.push(<path key={k} d={d} fill="none" stroke={ink(0.18 + k * 0.08)} strokeWidth={2 + (k === 3 ? 1 : 0)} />);
  }
  out.push(<polygon key="bolt" points="70,20 40,95 66,95 52,150 104,70 76,70 92,20" fill={ink(0.14)} />);
  return out;
}

function chip(r: R) {
  const out: ReactNode[] = [];
  const cx = 90 + r() * 90;
  const cy = 85;
  const w = 110;
  const h = 76;
  for (let i = 0; i < 7; i++) {
    const px = cx - w / 2 + 10 + i * ((w - 20) / 6);
    out.push(<line key={`t${i}`} x1={px} y1={cy - h / 2} x2={px} y2={cy - h / 2 - 22} stroke={ink(0.4)} strokeWidth={3} />);
    out.push(<line key={`b${i}`} x1={px} y1={cy + h / 2} x2={px} y2={cy + h / 2 + 22} stroke={ink(0.4)} strokeWidth={3} />);
  }
  for (let i = 0; i < 5; i++) {
    const py = cy - h / 2 + 10 + i * ((h - 20) / 4);
    out.push(<line key={`l${i}`} x1={cx - w / 2} y1={py} x2={cx - w / 2 - 22} y2={py} stroke={ink(0.4)} strokeWidth={3} />);
    out.push(<line key={`r${i}`} x1={cx + w / 2} y1={py} x2={cx + w / 2 + 22} y2={py} stroke={ink(0.4)} strokeWidth={3} />);
  }
  out.push(<rect key="body" x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={10} fill={ink(0.12)} stroke={ink(0.55)} strokeWidth={2} />);
  for (let i = 0; i < 12; i++)
    out.push(<rect key={`g${i}`} x={cx - 40 + (i % 4) * 22} y={cy - 22 + Math.floor(i / 4) * 16} width={14} height={9} rx={2} fill={ink(r() < 0.35 ? 0.5 : 0.18)} />);
  return out;
}

function blueprint(r: R) {
  const out: ReactNode[] = [];
  for (let x = 0; x <= W; x += 16) out.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={ink(x % 64 === 0 ? 0.14 : 0.06)} />);
  for (let y = 0; y <= H; y += 16) out.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={ink(y % 64 === 0 ? 0.14 : 0.06)} />);
  const x0 = 30 + r() * 40;
  out.push(<rect key="plan" x={x0} y={30} width={150} height={100} fill="none" stroke={ink(0.6)} strokeWidth={2} />);
  out.push(<line key="wall1" x1={x0 + 70} y1={30} x2={x0 + 70} y2={95} stroke={ink(0.6)} strokeWidth={2} />);
  out.push(<line key="wall2" x1={x0} y1={80} x2={x0 + 70} y2={80} stroke={ink(0.6)} strokeWidth={2} />);
  out.push(<path key="door" d={`M${x0 + 110} 130 A 22 22 0 0 1 ${x0 + 132} 108`} fill="none" stroke={ink(0.45)} strokeWidth={1.5} />);
  out.push(<line key="dim" x1={x0} y1={146} x2={x0 + 150} y2={146} stroke={ink(0.45)} strokeWidth={1.2} strokeDasharray="4 3" />);
  out.push(<circle key="arc" cx={x0 + 200} cy={60} r={36} fill="none" stroke={ink(0.3)} strokeWidth={1.5} strokeDasharray="3 5" />);
  return out;
}

function gears(r: R) {
  const out: ReactNode[] = [];
  const specs = [
    { x: 80 + r() * 30, y: 95, rad: 46 },
    { x: 170 + r() * 20, y: 55, rad: 30 },
    { x: 215 + r() * 30, y: 125, rad: 24 },
  ];
  specs.forEach((g, i) => {
    out.push(
      <g key={i} className="spin" style={{ transformOrigin: `${g.x}px ${g.y}px` }}>
        <circle cx={g.x} cy={g.y} r={g.rad} fill="none" stroke={ink(0.4)} strokeWidth={10} strokeDasharray="7 6" />
        <circle cx={g.x} cy={g.y} r={g.rad - 9} fill={ink(0.1)} stroke={ink(0.5)} strokeWidth={2} />
        <circle cx={g.x} cy={g.y} r={g.rad / 4} fill={ink(0.5)} />
      </g>,
    );
  });
  return out;
}

function molecules(r: R) {
  const out: ReactNode[] = [];
  for (let c = 0; c < 3; c++) {
    const cx = 50 + c * 100 + r() * 20;
    const cy = 50 + r() * 70;
    const n = 6;
    const pts = Array.from({ length: n }, (_, k) => {
      const a = (Math.PI / 3) * k;
      return { x: cx + 26 * Math.cos(a), y: cy + 26 * Math.sin(a) };
    });
    pts.forEach((p, k) => {
      const q = pts[(k + 1) % n];
      out.push(<line key={`${c}l${k}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={ink(0.4)} strokeWidth={2.5} />);
    });
    pts.forEach((p, k) => {
      out.push(<circle key={`${c}c${k}`} cx={p.x} cy={p.y} r={k % 2 ? 4 : 6} fill={ink(k % 2 ? 0.35 : 0.6)} />);
      if (r() < 0.35) {
        const ox = p.x + (p.x - cx) * 0.8;
        const oy = p.y + (p.y - cy) * 0.8;
        out.push(<line key={`${c}o${k}`} x1={p.x} y1={p.y} x2={ox} y2={oy} stroke={ink(0.3)} strokeWidth={2} />);
        out.push(<circle key={`${c}oc${k}`} cx={ox} cy={oy} r={4} fill={ink(0.4)} />);
      }
    });
  }
  return out;
}

const ART: Record<string, (r: R) => ReactNode[]> = {
  software: code,
  ai: neural,
  security: hexes,
  iot: circuit,
  electrical: waves,
  vlsi: chip,
  design: blueprint,
  fabrication: gears,
  study: molecules,
};

export default function CoverArt({
  category,
  seed,
  tall = false,
  children,
}: {
  category: string;
  seed: string;
  tall?: boolean;
  children?: ReactNode;
}) {
  const r = seeded(seed);
  const draw = ART[category] ?? code;
  const shift = Math.round(r() * 36 - 18); // each project's own shade of its domain colour
  return (
    <div className={`cover cat-${category}${tall ? " tall" : ""}`} style={{ filter: `hue-rotate(${shift}deg)` }}>
      <svg className="art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx={W * 0.15} cy={-10} r={120} fill={ink(0.12)} />
        {draw(r)}
        <rect x={0} y={H - 60} width={W} height={60} fill="rgb(0 0 0 / 0.12)" />
      </svg>
      <span className="cover-icon">
        <CategoryIcon category={category} size={tall ? 64 : 42} strokeWidth={1.6} />
      </span>
      {children}
    </div>
  );
}
