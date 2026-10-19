import type { Chart, Code, HandKind, Up } from '../engine/types';
import { UPCARDS, upLabel } from '../engine/types';

export interface GridRow { row: number; label: string }

export const ROWS: Record<HandKind, GridRow[]> = {
  hard: [
    { row: 7, label: '5–7' },
    ...[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((r) => ({ row: r, label: String(r) })),
    { row: 18, label: '18+' },
  ],
  soft: [13, 14, 15, 16, 17, 18, 19, 20].map((r) => ({ row: r, label: `A,${r - 11}` })),
  pair: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((r) => {
    const c = r === 11 ? 'A' : String(r);
    return { row: r, label: `${c},${c}` };
  }),
};

export function codesFor(chart: Chart, kind: HandKind, row: number): Code[] {
  return kind === 'hard' ? chart.hard[row] : kind === 'soft' ? chart.soft[row] : chart.pairs[row];
}

export function ChartGrid({
  chart, kind, onTap, selected, marks, overlay,
}: {
  chart: Chart;
  kind: HandKind;
  onTap: (row: number, up: Up) => void;
  selected?: { row: number; up: Up } | null;
  marks?: (row: number, up: Up) => 'miss' | 'ok' | null;
  /** count overlay: replacement code for a cell and whether it differs from basic */
  overlay?: (row: number, up: Up) => { code: Code; changed: boolean; hasIndex: boolean } | null;
}) {
  return (
    <div className="grid" role="table">
      <div className="grid-row head">
        <div className="grid-label">You</div>
        {UPCARDS.map((u) => <div key={u} className="grid-head">{upLabel(u)}</div>)}
      </div>
      {ROWS[kind].map(({ row, label }) => (
        <div className="grid-row" key={row}>
          <div className="grid-label">{label}</div>
          {codesFor(chart, kind, row).map((basicCode, i) => {
            const up = UPCARDS[i];
            const ov = overlay?.(row, up);
            const code = ov?.code ?? basicCode;
            const sel = selected && selected.row === row && selected.up === up;
            const m = marks?.(row, up);
            return (
              <button key={i} className={`cell c-${code}${sel ? ' sel' : ''}${ov?.changed ? ' dev' : ov?.hasIndex ? ' idx' : ''}`} onClick={() => onTap(row, up)} aria-label={`${label} vs ${upLabel(up)}: ${code}`}>
                {code}
                {m === 'miss' && <span className="dot" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Legend() {
  const items: [Code, string][] = [
    ['H', 'Hit'], ['S', 'Stand'], ['Dh', 'Double, else hit'], ['Ds', 'Double, else stand'],
    ['P', 'Split'], ['Rh', 'Surrender, else hit'], ['Rs', 'Surrender, else stand'], ['Rp', 'Surrender, else split'],
  ];
  return (
    <div className="legend">
      {items.map(([c, t]) => (
        <div key={c} className="legend-item"><span className={`cell mini c-${c}`}>{c}</span>{t}</div>
      ))}
    </div>
  );
}
