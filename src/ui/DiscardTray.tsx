import { useEffect, useRef, useState } from 'react';
import { trayState } from '../game/tray';

/* 3/4 view of an acrylic discard tray. u = left→right (0..1), v = front→back (0..1), z = height in px.
   Oblique projection: the back of the tray is up and to the right, the back wall leans away. */
const OX = 8, OY = 92, W = 88, DX = 34, DY = 24, LEAN = 7;
const HW = 50;        // acrylic wall height
const HMAX = 44;      // stack height of a completely dealt shoe
const LAYER = 1.35;   // one card layer, px
const X = (u: number, v: number, z: number) => OX + u * W + v * DX + LEAN * v * (z / HW);
const Y = (v: number, z: number) => OY - v * DY - z;
const P = (u: number, v: number, z: number) => `${X(u, v, z).toFixed(2)},${Y(v, z).toFixed(2)}`;
const poly = (...pts: [number, number, number][]) => pts.map((p) => P(...p)).join(' ');

const U1 = 0.06, U2 = 0.94, V1 = 0.1, V2 = 0.9; // card footprint inside the walls

function usePrefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
/** Smoothly follows `target` (stack height). Jumps straight there under prefers-reduced-motion. */
function useTween(target: number, ms: number) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  const reduced = usePrefersReduced();
  useEffect(() => {
    if (reduced || ms <= 0 || cur.current === target) { cur.current = target; setV(target); return; }
    const from = cur.current, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      cur.current = from + (target - from) * e;
      setV(cur.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return v;
}

export function DiscardTray({ discarded, total, cutRemaining }: { discarded: number; total: number; cutRemaining: number }) {
  const t = trayState(discarded, total, cutRemaining);
  const fillAnim = useTween(t.fill, t.fill === 0 ? 900 : 650);
  const h = fillAnim * HMAX;
  const zCut = t.cut * HMAX;
  const label = `Discard tray: ${t.pct}% of the shoe dealt, cut card at ${Math.round(t.cut * 100)}%`;
  const n = Math.ceil(h / LAYER);
  const layers = Array.from({ length: n }, (_, k) => {
    const z0 = k * LAYER, z1 = Math.min(h, z0 + LAYER);
    const j = (((k * 37) % 7) - 3) * 0.16; // little per-card wobble so it reads as a loose stack
    return { k, z0, z1, j };
  });
  const cutAbove = zCut > h; // cut card still waiting above the stack

  return (
    <svg className={`tray tray-${t.level}`} viewBox="0 12 144 102" role="img" aria-label={label} data-discarded={discarded} data-pct={t.pct} data-level={t.level}>
      <title>{label}</title>
      <defs>
        {/* our own card back: navy with a light diamond lattice. Defined in (u,v) units so it follows the perspective. */}
        <pattern id="tray-back" patternUnits="userSpaceOnUse" width="0.0625" height="0.1">
          <rect width="0.0625" height="0.1" fill="#dfe5f0" />
          <polygon points="0.03125,0.012 0.0545,0.05 0.03125,0.088 0.008,0.05" fill="#1a2547" />
        </pattern>
        <linearGradient id="tray-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eafaff" stopOpacity=".20" />
          <stop offset="1" stopColor="#bfe6f0" stopOpacity=".06" />
        </linearGradient>
        <linearGradient id="tray-floor" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1b2128" /><stop offset="1" stopColor="#0b0e11" />
        </linearGradient>
        <filter id="tray-blur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2.6" /></filter>
      </defs>

      {/* soft shadow on the felt */}
      <ellipse cx="78" cy="101" rx="68" ry="7" fill="#000" opacity=".35" filter="url(#tray-blur)" />

      {/* black base: floor, front face with finger notch, right face */}
      <polygon points={poly([-0.04, -0.06, 0], [1.04, -0.06, 0], [1.04, 1.06, 0], [-0.04, 1.06, 0])} fill="url(#tray-floor)" />
      <polygon points={`${P(1.04, -0.06, 0)} ${P(1.04, 1.06, 0)} ${X(1.04, 1.06, 0)},${Y(1.06, 0) + 12} ${X(1.04, -0.06, 0)},${Y(-0.06, 0) + 12}`} fill="#080a0c" />
      <path d={`M${X(-0.04, -0.06, 0)} ${Y(-0.06, 0)} H${X(1.04, -0.06, 0)} V${Y(-0.06, 0) + 12} H${X(0.82, -0.06, 0)} Q${X(0.78, -0.06, 0)} ${Y(-0.06, 0) + 4.5} ${X(0.7, -0.06, 0)} ${Y(-0.06, 0) + 4.5} H${X(0.58, -0.06, 0)} Q${X(0.5, -0.06, 0)} ${Y(-0.06, 0) + 4.5} ${X(0.46, -0.06, 0)} ${Y(-0.06, 0) + 12} H${X(-0.04, -0.06, 0)} Z`} fill="#12161a" />
      <line x1={X(-0.04, -0.06, 0)} y1={Y(-0.06, 0) + 0.4} x2={X(1.04, -0.06, 0)} y2={Y(-0.06, 0) + 0.4} stroke="#4a5663" strokeWidth=".8" />

      {/* glass behind the cards: back wall (leaning) and left wall */}
      <polygon points={poly([0, 1, 0], [1, 1, 0], [1, 1, HW], [0, 1, HW])} fill="url(#tray-glass)" stroke="#cfeaf2" strokeOpacity=".35" strokeWidth=".8" />
      <polygon points={poly([0, 0, 0], [0, 1, 0], [0, 1, HW], [0, 0, HW])} fill="url(#tray-glass)" stroke="#cfeaf2" strokeOpacity=".4" strokeWidth=".8" />

      {/* the stack: right face, front face (white card edges, slightly ragged), then the card-back top */}
      <g className="stack">
        {layers.map(({ k, z0, z1, j }) => (
          <polygon key={`r${k}`} points={poly([U2, V1 + j * 0.02, z0], [U2, V2 + j * 0.02, z0], [U2, V2 + j * 0.02, z1], [U2, V1 + j * 0.02, z1])} fill={k % 2 ? '#aab1bd' : '#c9ceD6'} />
        ))}
        {layers.map(({ k, z0, z1, j }) => (
          <polygon key={`f${k}`} points={poly([U1 + j * 0.01, V1, z0], [U2 + j * 0.01, V1, z0], [U2 + j * 0.01, V1, z1], [U1 + j * 0.01, V1, z1])} fill={k % 2 ? '#f4f4ef' : '#dcdfe4'} />
        ))}
        {h > 0.4 && (
          <g transform={`matrix(${W} 0 ${DX + LEAN * (h / HW)} ${-DY} ${OX} ${OY - h})`}>
            <polygon points={`${U1},${V1} ${U2},${V1} ${U2},${V2} ${U1},${V2}`} fill="url(#tray-back)" />
          </g>
        )}
      </g>

      {/* cut card: red plate at the reshuffle point; its glow warns as the stack nears it */}
      <g className="cut">
        {cutAbove && <polygon points={poly([0.03, 0.06, zCut], [0.97, 0.06, zCut], [0.97, 0.94, zCut], [0.03, 0.94, zCut])} fill="#ff3b3b" fillOpacity=".38" stroke="#ff5a4d" strokeWidth=".9" />}
        <polygon className="cut-glow" points={poly([0.03, 0.06, zCut], [0.97, 0.06, zCut], [0.97, 0.94, zCut], [0.03, 0.94, zCut])} fill="none" stroke={t.level === 'cut' ? '#ff3b30' : '#ffb020'} strokeWidth="3.4" filter="url(#tray-blur)" opacity={t.level === 'ok' ? 0 : t.level === 'near' ? 0.75 : 1} />
        <polygon points={poly([0.03, 0.06, zCut - 1.1], [0.97, 0.06, zCut - 1.1], [0.97, 0.06, zCut + 0.7], [0.03, 0.06, zCut + 0.7])} fill="#e5302a" />
        <polygon points={poly([0.97, 0.06, zCut - 1.1], [0.97, 0.94, zCut - 1.1], [0.97, 0.94, zCut + 0.7], [0.97, 0.06, zCut + 0.7])} fill="#b7211d" />
      </g>

      {/* glass in front of the cards: front wall and (thick) right wall */}
      <polygon points={poly([0, 0, 0], [1, 0, 0], [1, 0, HW], [0, 0, HW])} fill="url(#tray-glass)" />
      <polygon points={poly([1, 0, 0], [1, 1, 0], [1, 1, HW], [1, 0, HW])} fill="#d6f2f7" fillOpacity=".10" />
      <polygon points={poly([1.0, 0, 0], [1.045, 0, 0], [1.045, 0, HW], [1.0, 0, HW])} fill="#d6f2f7" fillOpacity=".34" />
      <polygon points={poly([1.0, 0, HW], [1.045, 0, HW], [1.045, 1, HW], [1.0, 1, HW])} fill="#e9fbff" fillOpacity=".5" />
      {/* reflections */}
      <polygon points={poly([0.08, 0, HW - 4], [0.19, 0, HW - 4], [0.07, 0, 7], [-0.04, 0, 7])} fill="#fff" fillOpacity=".15" />
      <polygon points={poly([0.23, 0, HW - 4], [0.26, 0, HW - 4], [0.14, 0, 7], [0.11, 0, 7])} fill="#fff" fillOpacity=".12" />
      <polygon points={poly([1, 0.15, HW - 4], [1, 0.28, HW - 4], [1, 0.28, 8], [1, 0.15, 8])} fill="#fff" fillOpacity=".12" />

      {/* rims and edges */}
      <g className="tray-rim" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline className="rim-main" points={poly([0, 0, HW], [1.045, 0, HW], [1.045, 1, HW])} strokeWidth="3" />
        <polyline className="rim-inner" points={poly([0, 0, HW - 2.6], [1, 0, HW - 2.6], [1, 1, HW - 2.6])} strokeWidth=".9" />
        <polyline className="rim-back" points={poly([0, 0, HW], [0, 1, HW], [1.045, 1, HW])} strokeWidth="1.6" />
        <line className="rim-main" x1={X(1.045, 0, 0)} y1={Y(0, 0)} x2={X(1.045, 0, HW)} y2={Y(0, HW)} strokeWidth="3" />
        <line className="rim-inner" x1={X(1, 0, 0)} y1={Y(0, 0)} x2={X(1, 0, HW)} y2={Y(0, HW)} strokeWidth=".9" />
        <line className="rim-main" x1={X(0, 0, 0)} y1={Y(0, 0)} x2={X(0, 0, HW)} y2={Y(0, HW)} strokeWidth="1.8" />
        <line className="rim-back" x1={X(1.045, 1, 0)} y1={Y(1, 0)} x2={X(1.045, 1, HW)} y2={Y(1, HW)} strokeWidth="1.6" />
        <line className="rim-back" x1={X(0, 1, 0)} y1={Y(1, 0)} x2={X(0, 1, HW)} y2={Y(1, HW)} strokeWidth="1.2" />
        <line className="rim-main" x1={X(0, 0, 0)} y1={Y(0, 0)} x2={X(1.045, 0, 0)} y2={Y(0, 0)} strokeWidth="1.1" />
      </g>
    </svg>
  );
}
