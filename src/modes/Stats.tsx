import type { HandKind } from '../engine/types';
import { upLabel } from '../engine/types';
import { CODE_NAME, rowLabel } from '../engine/explain';
import { codeAt } from '../engine/decide';
import { pct, weakSpots, freshCountStats, type Tally, type ErrTally } from '../stats/stats';
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
      <h3>Card counting (Hi-Lo)</h3>
      <CountStatsView store={store} />
      <button className="btn wide ghost danger" onClick={() => { if (confirm('Reset all stats on this device?')) mutate((s) => { const f = { cells: {}, kinds: { hard: { n: 0, correct: 0 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } } }; s.play = { ...f, hands: 0, net: 0 }; s.drill = structuredClone(f); s.count = freshCountStats(); }); }}>Reset stats</button>
    </div>
  );
}

function sumErr(...ts: ErrTally[]): ErrTally {
  return ts.reduce((a, t) => ({ n: a.n + t.n, correct: a.correct + t.correct, absErr: a.absErr + t.absErr }), { n: 0, correct: 0, absErr: 0 });
}
const avgErr = (t: ErrTally) => (t.n ? (t.absErr / t.n).toFixed(2) : '–');

function CountStatsView({ store }: { store: ModeProps['store'] }) {
  const c = store.count;
  const rc = sumErr(c.flash, c.rounds.rc, c.play.rc);
  const tc = sumErr(c.rounds.tc, c.play.tc);
  const bet = c.play.bet;
  const speeds = [c.flash.bestSpeed, c.rounds.bestSpeed].filter((x): x is number => x !== null);
  return (
    <>
      <div className="stat-cards">
        <div className="stat"><div className="big">{speeds.length ? `${Math.min(...speeds).toFixed(1)}s` : '–'}</div><div className="muted">fastest speed with a correct count (s/card)</div></div>
        <div className="stat"><div className="big">{avgErr(rc)}</div><div className="muted">avg running-count error</div></div>
      </div>
      <Bar label="Running count (all)" t={rc} />
      <div className="muted small sub-bars">
        Flash {pct(c.flash) ?? '–'}% ({c.flash.n}) · Rounds {pct(c.rounds.rc) ?? '–'}% ({c.rounds.rc.n}) · In play {pct(c.play.rc) ?? '–'}% ({c.play.rc.n})
        {c.flash.bestSpeed !== null && <> · best flash {c.flash.bestSpeed.toFixed(1)}s</>}
        {c.rounds.bestSpeed !== null && <> · best rounds {c.rounds.bestSpeed.toFixed(1)}s</>}
      </div>
      <Bar label="True count" t={tc} />
      <div className="muted small sub-bars">Avg TC error {avgErr(tc)} (vs exact TC)</div>
      <Bar label="Bet sizing vs ramp" t={bet} />
      <div className="muted small sub-bars">Avg bet error {bet.n ? (bet.absErr / bet.n).toFixed(2) : '–'} units · {store.settings.count.spread} spread</div>
    </>
  );
}
