import type { ReactNode } from "react";
import { categoryEmoji } from "@/lib/catalog";

/**
 * Artwork for a project, drawn on the server from its track: a browser full of code for web,
 * a neural network for AI, pixels for games, gears for mechanical… in black line art on a flat
 * colour, with a big emoji sticker. Each project gets its own variation (seeded by its address).
 */

const W = 320;
const H = 170;
const ink = (o: number) => `rgb(13 13 18 / ${o.toFixed(2)})`;

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


function browser(r: R) {
  const out: ReactNode[] = [];
  const x = 18 + r() * 20;
  const y = 16;
  const w = 210;
  const h = 132;
  out.push(<rect key="win" x={x} y={y} width={w} height={h} rx={10} fill="rgb(255 255 255 / 0.55)" stroke={ink(0.85)} strokeWidth={2.5} />);
  out.push(<line key="bar" x1={x} y1={y + 22} x2={x + w} y2={y + 22} stroke={ink(0.85)} strokeWidth={2.5} />);
  [0, 1, 2].forEach((i) => out.push(<circle key={`d${i}`} cx={x + 14 + i * 12} cy={y + 11} r={3.5} fill={ink(0.8)} />));
  let indent = 0;
  for (let i = 0; i < 6; i++) {
    indent = Math.max(0, Math.min(3, indent + (r() < 0.45 ? 1 : r() < 0.5 ? -1 : 0)));
    const lx = x + 14 + indent * 14;
    const w1 = 18 + r() * 40;
    const w2 = 16 + r() * 60;
    out.push(<rect key={`a${i}`} x={lx} y={y + 34 + i * 15} width={w1} height={6} rx={3} fill={ink(0.75)} />);
    out.push(<rect key={`b${i}`} x={lx + w1 + 6} y={y + 34 + i * 15} width={Math.min(w2, x + w - lx - w1 - 20)} height={6} rx={3} fill={ink(0.25)} />);
  }
  return out;
}

function phones(r: R) {
  const out: ReactNode[] = [];
  const drawPhone = (k: string, x: number, y: number, rot: number) => {
    const icons: ReactNode[] = [];
    for (let i = 0; i < 9; i++)
      icons.push(<rect key={`${k}i${i}`} x={x + 12 + (i % 3) * 22} y={y + 22 + Math.floor(i / 3) * 24} width={14} height={14} rx={4} fill={ink(r() < 0.35 ? 0.75 : 0.22)} />);
    out.push(
      <g key={k} transform={`rotate(${rot} ${x + 40} ${y + 70})`}>
        <rect x={x} y={y} width={80} height={140} rx={14} fill="rgb(255 255 255 / 0.6)" stroke={ink(0.85)} strokeWidth={2.5} />
        <rect x={x + 30} y={y + 7} width={20} height={5} rx={2.5} fill={ink(0.8)} />
        {icons}
      </g>,
    );
  };
  drawPhone("p1", 30 + r() * 20, 20, -8);
  drawPhone("p2", 130 + r() * 20, 30, 7);
  return out;
}

function bars(r: R) {
  const out: ReactNode[] = [];
  out.push(<line key="ax" x1={20} y1={150} x2={260} y2={150} stroke={ink(0.85)} strokeWidth={2.5} />);
  const pts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const h = 25 + r() * 95;
    const x = 30 + i * 32;
    out.push(<rect key={`b${i}`} x={x} y={150 - h} width={20} height={h} rx={3} fill={i % 3 === 0 ? ink(0.8) : "rgb(255 255 255 / 0.65)"} stroke={ink(0.85)} strokeWidth={2} />);
    pts.push(`${x + 10},${(150 - h - 14 - r() * 10).toFixed(0)}`);
  }
  out.push(<polyline key="line" points={pts.join(" ")} fill="none" stroke={ink(0.8)} strokeWidth={2.5} strokeDasharray="6 4" />);
  return out;
}

function chain(r: R) {
  const out: ReactNode[] = [];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = 22 + i * 64;
    const y = 52 + (i % 2 ? 24 : 0) + r() * 10;
    if (i < n - 1) out.push(<line key={`l${i}`} x1={x + 44} y1={y + 22} x2={x + 64} y2={52 + ((i + 1) % 2 ? 24 : 0) + 22} stroke={ink(0.85)} strokeWidth={3} />);
    out.push(
      <g key={`c${i}`}>
        <rect x={x} y={y} width={44} height={44} rx={6} fill="rgb(255 255 255 / 0.6)" stroke={ink(0.85)} strokeWidth={2.5} />
        <path d={`M${x} ${y} l10 -10 h44 l-10 10 M${x + 44} ${y} l10 -10 v44 l-10 10`} fill="none" stroke={ink(0.85)} strokeWidth={2.5} strokeLinejoin="round" />
        <text x={x + 22} y={y + 29} textAnchor="middle" fontSize={14} fontWeight={800} fill={ink(0.8)} fontFamily="monospace">
          #{i + 1}
        </text>
      </g>,
    );
  }
  return out;
}

function pixels(r: R) {
  const out: ReactNode[] = [];
  const s = 10;
  for (let row = 0; row < 17; row++)
    for (let col = 0; col < 32; col++) {
      const v = r();
      if (v < 0.07) out.push(<rect key={`${row}-${col}`} x={col * s} y={row * s} width={s} height={s} fill={ink(0.75)} />);
      else if (v < 0.13) out.push(<rect key={`${row}-${col}`} x={col * s} y={row * s} width={s} height={s} fill="rgb(255 255 255 / 0.7)" />);
    }
  const cx = 70;
  const cy = 95;
  out.push(<path key="dpad" d={`M${cx - 12} ${cy - 36} h24 v24 h24 v24 h-24 v24 h-24 v-24 h-24 v-24 h24 z`} fill="rgb(255 255 255 / 0.9)" stroke={ink(0.9)} strokeWidth={3} strokeLinejoin="round" />);
  out.push(<circle key="b1" cx={170} cy={80} r={14} fill={ink(0.85)} />);
  out.push(<circle key="b2" cx={200} cy={110} r={14} fill="rgb(255 255 255 / 0.9)" stroke={ink(0.9)} strokeWidth={3} />);
  return out;
}

function clouds(r: R) {
  const out: ReactNode[] = [];
  const cloud = (k: string, x: number, y: number, sc: number) =>
    out.push(
      <path
        key={k}
        transform={`translate(${x} ${y}) scale(${sc})`}
        d="M20 60 a20 20 0 0 1 4 -39 a28 28 0 0 1 52 -6 a22 22 0 0 1 24 22 a20 20 0 0 1 -6 23 z"
        fill="rgb(255 255 255 / 0.75)"
        stroke={ink(0.85)}
        strokeWidth={2.5 / sc}
        strokeLinejoin="round"
      />,
    );
  cloud("c1", 20 + r() * 20, 14, 1.15);
  cloud("c2", 150 + r() * 20, 6, 0.8);
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 70;
    out.push(<line key={`w${i}`} x1={x + 25} y1={88} x2={x + 25} y2={112} stroke={ink(0.7)} strokeWidth={2.5} strokeDasharray="4 4" />);
    out.push(<rect key={`s${i}`} x={x} y={112} width={50} height={36} rx={5} fill="rgb(255 255 255 / 0.6)" stroke={ink(0.85)} strokeWidth={2.5} />);
    out.push(<line key={`s${i}a`} x1={x + 8} y1={124} x2={x + 42} y2={124} stroke={ink(0.6)} strokeWidth={2.5} />);
    out.push(<circle key={`s${i}b`} cx={x + 40} cy={138} r={3} fill={ink(0.8)} />);
  }
  return out;
}

function tree(r: R) {
  const out: ReactNode[] = [];
  const nodes: { x: number; y: number }[] = [];
  const levels = [1, 2, 4, 8];
  levels.forEach((n, li) => {
    for (let i = 0; i < n; i++) nodes.push({ x: ((i + 0.5) * 300) / n + 10, y: 22 + li * 40 });
  });
  for (let i = 1; i < nodes.length; i++) {
    const parent = nodes[Math.floor((i - 1) / 2)];
    out.push(<line key={`e${i}`} x1={parent.x} y1={parent.y} x2={nodes[i].x} y2={nodes[i].y} stroke={ink(0.75)} strokeWidth={2.5} />);
  }
  nodes.forEach((p, i) =>
    out.push(<circle key={`n${i}`} cx={p.x} cy={p.y} r={i < 3 ? 11 : 8} fill={r() < 0.3 ? ink(0.85) : "rgb(255 255 255 / 0.85)"} stroke={ink(0.85)} strokeWidth={2.5} />),
  );
  return out;
}

const ART: Record<string, (r: R) => ReactNode[]> = {
  web: browser,
  mobile: phones,
  data: bars,
  web3: chain,
  games: pixels,
  cloud: clouds,
  systems: tree,
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
  const draw = ART[category] ?? browser;
  const tilt = Math.round(r() * 16 - 8);
  return (
    <div className={`cover cat-${category}${tall ? " tall" : ""}`}>
      <svg className="art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        {draw(r)}
      </svg>
      <span className="cover-emoji" style={{ rotate: `${tilt}deg` }} aria-hidden>
        {categoryEmoji(category)}
      </span>
      {children}
    </div>
  );
}
