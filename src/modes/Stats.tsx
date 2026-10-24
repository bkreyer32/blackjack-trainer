import type { HandKind } from '../engine/types';
import { upLabel } from '../engine/types';
import { CODE_NAME, rowLabel } from '../engine/explain';
import { codeAt } from '../engine/decide';
import { useState } from 'react';
import { pct, weakSpots, freshBucket, devTally, statsView, savedSigs, sigLabel, rulesSig, rulesFromSig, type Tally, type ErrTally } from '../stats/stats';
import { chartFor } from '../engine/strategy';
import { useEntitlement, openPaywall } from '../entitlements';
import { FEATURE_COPY } from '../entitlements/gating';
import { Lock } from '../ui/Paywall';
import { activeIndexPlays, playName, fmtTc } from '../engine/deviations';
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

export function Stats({ store: live, mutate, chart: liveChart }: ModeProps) {
  const { pro } = useEntitlement();
  const curSig = rulesSig(live.rules);
  const [sel, setSel] = useState<'all' | string>(curSig);
  const sigs = savedSigs(live);
  const scope = sel === 'all' || sigs.includes(sel) ? sel : curSig;
  const store = statsView(live, scope);
  const chart = scope === 'all' || scope === curSig ? liveChart : chartFor(rulesFromSig(scope));
  const sum = (k: HandKind): Tally => ({ n: store.play.kinds[k].n + store.drill.kinds[k].n, correct: store.play.kinds[k].correct + store.drill.kinds[k].correct });
  const all = (['hard', 'soft', 'pair'] as HandKind[]).reduce((a, k) => ({ n: a.n + sum(k).n, correct: a.correct + sum(k).correct }), { n: 0, correct: 0 });
  const weak = weakSpots(store, 1).slice(0, 12);
  return (
    <div className="screen scroll">
      <div className="scope" role="group" aria-label="Show stats for">
        <button className={scope === 'all' ? 'on' : ''} aria-pressed={scope === 'all'} onClick={() => setSel('all')}>All rule sets</button>
        {sigs.map((g) => (
          <button key={g} className={scope === g ? 'on' : ''} aria-pressed={scope === g} onClick={() => setSel(g)}>
            {g === curSig ? <><b>This table</b> · {sigLabel(g)}</> : sigLabel(g)}
          </button>
        ))}
      </div>
      {scope !== 'all' && scope !== curSig && <p className="muted small">Stats from another rule set. Switch rules (top right) to practise it.</p>}
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
      <h3>Deviations (index plays)</h3>
      {pro ? <DevStatsView store={store} chart={chart} /> : <LockedStats feature="countStats" />}
      <h3>Card counting (Hi-Lo)</h3>
      {pro ? <CountStatsView store={store} /> : <LockedStats feature="countStats" />}
      <button className="btn wide ghost danger" onClick={() => {
        const what = scope === 'all' ? 'ALL stats for every rule set' : `the stats for ${sigLabel(scope)}`;
        if (!confirm(`Reset ${what} on this device?`)) return;
        mutate((s) => {
          const cur = rulesSig(s.rules);
          if (scope === 'all') { s.buckets = {}; Object.assign(s, freshBucket()); }
          else if (scope === cur) Object.assign(s, freshBucket());
          else delete s.buckets[scope];
        });
        setSel(curSig);
      }}>{scope === 'all' ? 'Reset all stats' : 'Reset stats for this rule set'}</button>
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

function DevStatsView({ store, chart }: { store: ModeProps['store']; chart: ModeProps['chart'] }) {
  const rows = activeIndexPlays(chart.rules).map(({ play, app }) => ({ play, app, t: devTally(store, play.id) }));
  const tot = rows.reduce((a, r) => ({ n: a.n + (r.t?.n ?? 0), correct: a.correct + (r.t?.correct ?? 0) }), { n: 0, correct: 0 });
  const sum = (m: Record<string, Tally>) => Object.values(m).reduce((a, t) => ({ n: a.n + t.n, correct: a.correct + t.correct }), { n: 0, correct: 0 });
  return (
    <>
      <Bar label="All index decisions" t={tot} />
      <div className="muted small sub-bars">Drill {pct(sum(store.dev.drill)) ?? '–'}% ({sum(store.dev.drill).n}) · In play {pct(sum(store.dev.play)) ?? '–'}% ({sum(store.dev.play).n})</div>
      <div className="dev-table">
        {rows.map(({ play, app, t }) => {
          const p = pct(t);
          return (
            <div key={play.id} className={`dev-row${app.ok ? '' : ' off'}`}>
              <span className="dev-name">{playName(play)}{play.group === 'Fab4' ? ' (surr.)' : ''}</span>
              <span className="muted">{fmtTc(play.index)}</span>
              <span className="dev-bar"><span style={{ width: `${p ?? 0}%`, background: p === null ? 'transparent' : p >= 90 ? '#2fbf71' : p >= 70 ? '#e0b43a' : '#e5484d' }} /></span>
              <span className="muted">{t ? `${p}% · ${t.n}` : app.ok ? '–' : 'off'}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LockedStats({ feature }: { feature: 'countStats' }) {
  const f = FEATURE_COPY[feature];
  return (
    <button className="locked-card" onClick={() => openPaywall(feature)}>
      <Lock /> <b>{f.title}</b>
      <span className="muted small">{f.blurb} Tap to unlock.</span>
    </button>
  );
}
