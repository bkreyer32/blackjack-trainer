import { useState } from 'react';
import type { HandKind, Up } from '../engine/types';
import { upLabel } from '../engine/types';
import { ChartGrid, Legend, codesFor } from '../ui/ChartGrid';
import { Sheet } from '../ui/Sheet';
import { CODE_NAME, explain, rowLabel } from '../engine/explain';
import { cellKey } from '../engine/decide';
import { combinedTally, pct } from '../stats/stats';
import type { ModeProps } from './common';

export function Learn({ store, chart }: ModeProps) {
  const [kind, setKind] = useState<HandKind>('hard');
  const [sel, setSel] = useState<{ row: number; up: Up } | null>(null);
  const code = sel ? codesFor(chart, kind, sel.row)[sel.up - 2] : null;
  const tally = sel ? combinedTally(store, cellKey({ kind, row: sel.row, up: sel.up })) : undefined;
  const marks = (row: number, up: Up) => {
    const t = combinedTally(store, cellKey({ kind, row, up }));
    if (!t) return null;
    return t.correct < t.n && t.lastWrong ? 'miss' : 'ok';
  };
  return (
    <div className="screen">
      <div className="seg">
        {(['hard', 'soft', 'pair'] as HandKind[]).map((k) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => { setKind(k); setSel(null); }}>
            {k === 'hard' ? 'Hard' : k === 'soft' ? 'Soft' : 'Pairs'}
          </button>
        ))}
      </div>
      <p className="hint">Dealer upcard across the top. Tap any cell for the play and why. <span className="dot inline" /> = you missed it last time.</p>
      <ChartGrid chart={chart} kind={kind} onTap={(row, up) => setSel({ row, up })} selected={sel} marks={marks} />
      <Legend />
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? `${rowLabel(kind, sel.row)} vs dealer ${upLabel(sel.up)}` : ''}>
        {sel && code && (
          <>
            <div className={`play-pill c-${code}`}>{CODE_NAME[code]}</div>
            <p className="reason">{explain(kind, sel.row, sel.up, code, chart.rules)}</p>
            {tally && <p className="muted">Your record here: {tally.correct}/{tally.n} ({pct(tally)}%)</p>}
          </>
        )}
      </Sheet>
    </div>
  );
}
