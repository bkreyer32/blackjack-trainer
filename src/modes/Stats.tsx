import type { HandKind } from '../engine/types';
import { upLabel } from '../engine/types';
import { CODE_NAME, rowLabel } from '../engine/explain';
import { codeAt } from '../engine/decide';
import { pct, weakSpots, type Tally } from '../stats/stats';
import type { ModeProps } from './common';

function Bar({ label, t }: { label: string; t: Tally }) {
  const p = pct(t);
  return (
    <div className="bar">
      <div className="bar-top"><span>{label}</span><span>{p === null ? '–' : `${p}%`} <span className="muted">({t.correct}/{t.n})</span></span></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${p ?? 0}%`, background: p === null ? 'transparent' : p >= 95 ? '#2fbf71' : p >= 80 ? '#e0b43a' : '#e5484d' }} /></div>
    </div>
  );
}

const KIND_LABEL: Record<HandKind, string> = { hard: 'Hard totals', soft: 'Soft totals', pair: 'Pairs' };

export function Stats({ store, mutate, chart }: ModeProps) {
  const sum = (k: HandKind): Tally => ({ n: store.play.kinds[k].n + store.drill.kinds[k].n, correct: store.play.kinds[k].correct + store.drill.kinds[k].correct });
  const all = (['hard', 'soft', 'pair'] as HandKind[]).reduce((a, k) => ({ n: a.n + sum(k).n, correct: a.correct + sum(k).correct }), { n: 0, correct: 0 });
  const weak = weakSpots(store, 1).slice(0, 12);
  return (
    <div className="screen scroll">
      <div className="stat-cards">
        <div className="stat"><div className="big">{pct(all) ?? '–'}{all.n ? '%' : ''}</div><div className="muted">overall accuracy</div></div>
        <div className="stat"><div className="big">{all.n}</div><div className="muted">decisions</div></div>
        <div className="stat"><div className="big">{store.play.hands}</div><div className="muted">hands played</div></div>
        <div className="stat"><div className="big">{store.play.net >= 0 ? '+' : ''}{store.play.net}</div><div className="muted">net units</div></div>
      </div>
      <h3>By hand type</h3>
      {(['hard', 'soft', 'pair'] as HandKind[]).map((k) => <Bar key={k} label={KIND_LABEL[k]} t={sum(k)} />)}
      <h3>Play vs Drill</h3>
      <Bar label="Play mode" t={(['hard', 'soft', 'pair'] as HandKind[]).reduce((a, k) => ({ n: a.n + store.play.kinds[k].n, correct: a.correct + store.play.kinds[k].correct }), { n: 0, correct: 0 })} />
      <Bar label="Drills" t={(['hard', 'soft', 'pair'] as HandKind[]).reduce((a, k) => ({ n: a.n + store.drill.kinds[k].n, correct: a.correct + store.drill.kinds[k].correct }), { n: 0, correct: 0 })} />
      <h3>Weak spots</h3>
      {weak.length === 0 ? (
        <p className="muted">No misses yet. Play or drill a few hands and the cells you miss will show up here — and get dealt more often.</p>
      ) : (
        <div className="weak-list">
          {weak.map(({ cell, t, acc }) => (
            <div key={`${cell.kind}${cell.row}${cell.up}`} className="weak">
              <div>{rowLabel(cell.kind, cell.row)} <span className="muted">vs</span> {upLabel(cell.up)}</div>
              <div className={`play-pill tiny c-${codeAt(chart, cell)}`}>{CODE_NAME[codeAt(chart, cell)]}</div>
              <div className="muted">{Math.round(acc * 100)}% · {t.n}</div>
            </div>
          ))}
        </div>
      )}
      <button className="btn wide ghost danger" onClick={() => { if (confirm('Reset all stats on this device?')) mutate((s) => { const f = { cells: {}, kinds: { hard: { n: 0, correct: 0 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } } }; s.play = { ...f, hands: 0, net: 0 }; s.drill = structuredClone(f); }); }}>Reset stats</button>
    </div>
  );
}
