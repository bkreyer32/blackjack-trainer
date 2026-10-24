import { trayState } from '../game/tray';

// Side view. Tray interior runs x 6..(88 + slant), floor y=40, top y=6 (full shoe). Back wall (right) leans outward.
const FLOOR = 40, TOP = 6, LEFT = 7, WALL_B = 89, SLANT = 9;
const xr = (y: number) => WALL_B + ((FLOOR - y) / (FLOOR - TOP)) * SLANT;
const yOf = (f: number) => FLOOR - f * (FLOOR - TOP);

export function DiscardTray({ discarded, total, cutRemaining }: { discarded: number; total: number; cutRemaining: number }) {
  const t = trayState(discarded, total, cutRemaining);
  const yCut = yOf(t.cut);
  // Stack: left edge, top edge (tilted like leaning cards), right edge follows the slanted wall.
  const label = `Discard tray: ${t.pct}% of the shoe dealt, cut card at ${Math.round(t.cut * 100)}%`;
  return (
    <svg className={`tray tray-${t.level}`} viewBox="0 0 104 44" role="img" aria-label={label} data-discarded={discarded} data-pct={t.pct} data-level={t.level}>
      <title>{label}</title>
      <defs>
        <clipPath id="tray-in"><path d={`M${LEFT} ${TOP} L${LEFT} ${FLOOR} L${WALL_B} ${FLOOR} L${WALL_B + SLANT} ${TOP} Z`} /></clipPath>
      </defs>
      {/* translucent tray body */}
      <path className="tray-glass" d={`M${LEFT} ${TOP} L${LEFT} ${FLOOR} L${WALL_B} ${FLOOR} L${WALL_B + SLANT} ${TOP} Z`} />
      <g clipPath="url(#tray-in)">
        <g className="tray-stack" style={{ transform: `translateY(${(1 - t.fill) * (FLOOR - TOP)}px)` }}>
          {/* stack body drawn at full height, slid up/down so the move can animate */}
          <rect className="stack-body" x={LEFT} y={TOP} width={WALL_B + SLANT - LEFT} height={FLOOR - TOP + 2} />
          {t.fill > 0 && Array.from({ length: Math.ceil((FLOOR - TOP + 2) / 1.7) + 4 }, (_, k) => {
            const y = TOP + k * 1.7;
            return <line key={k} className="stack-layer" x1={LEFT} y1={y + 3} x2={WALL_B + SLANT} y2={y - 3} />;
          })}
          {t.fill > 0 && <line className="stack-top" x1={LEFT} y1={TOP + 3} x2={WALL_B + SLANT} y2={TOP - 3} />}
        </g>
      </g>
      {/* cut card: a coloured card standing in the tray at the reshuffle point */}
      <line className="cut-line" x1={LEFT - 3} y1={yCut + 2.5} x2={xr(yCut) + 5} y2={yCut - 2.5} />
      {/* tray frame */}
      <path className="tray-frame" d={`M${LEFT} ${TOP} L${LEFT} ${FLOOR} L${WALL_B} ${FLOOR} L${WALL_B + SLANT} ${TOP}`} />
      <rect className="tray-foot" x={LEFT - 2} y={FLOOR} width={WALL_B - LEFT + 6} height="2.5" rx="1" />
    </svg>
  );
}
