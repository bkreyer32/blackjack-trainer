import { useState } from 'react';
import type { HandKind, Up } from '../engine/types';
import { upLabel } from '../engine/types';
import { ChartGrid, Legend, codesFor } from '../ui/ChartGrid';
import { Sheet } from '../ui/Sheet';
import { CODE_NAME, explain, rowLabel } from '../engine/explain';
import { cellKey } from '../engine/decide';
import { combinedTally, pct } from '../stats/stats';
import type { ModeProps } from './common';
import { activeIndexPlays, chartCodeAt, describeIndex, playName, fmtTc, ACT_VERB, type IndexPlay } from '../engine/deviations';
import { devTally } from '../stats/stats';
import { useEntitlement, openPaywall } from '../entitlements';
import { Lock } from '../ui/Paywall';

type LearnView = HandKind | 'index';

export function Learn(props: ModeProps) {
  const { store, chart, openGuide } = props;
  const { pro } = useEntitlement();
  const [kind, setKind] = useState<LearnView>('hard');
  const [tc, setTc] = useState<number | null>(null);
  const [sel, setSel] = useState<{ row: number; up: Up } | null>(null);
  const hk = kind === 'index' ? 'hard' : kind;
  const ovr = (row: number, up: Up) => (tc === null ? null : chartCodeAt(chart.rules, hk, row, up, tc));
  const overlay = tc === null ? undefined : (row: number, up: Up) => {
    const r = ovr(row, up)!;
    return { code: r.code, changed: r.code !== codesFor(chart, hk, row)[up - 2], hasIndex: r.plays.length > 0 };
  };
  const cellPlays: IndexPlay[] = sel ? chartCodeAt(chart.rules, hk, sel.row, sel.up, tc ?? 0).plays : [];
  const code = sel ? (tc === null ? codesFor(chart, hk, sel.row)[sel.up - 2] : ovr(sel.row, sel.up)!.code) : null;
  const basicCode = sel ? codesFor(chart, hk, sel.row)[sel.up - 2] : null;
  const tally = sel ? combinedTally(store, cellKey({ kind: hk, row: sel.row, up: sel.up })) : undefined;
  const marks = (row: number, up: Up) => {
    const t = combinedTally(store, cellKey({ kind: hk, row, up }));
    if (!t) return null;
    return t.correct < t.n && t.lastWrong ? 'miss' : 'ok';
  };
  return (
    <div className="screen">
      <div className="seg">
        {(['hard', 'soft', 'pair', 'index'] as LearnView[]).map((k) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => { setKind(k); setSel(null); }}>
            {k === 'hard' ? 'Hard' : k === 'soft' ? 'Soft' : k === 'pair' ? 'Pairs' : 'Index'}
          </button>
        ))}
      </div>
      {kind === 'index' ? <IndexList {...props} /> : <>
      <div className="tc-bar">
        <button className={`tc-toggle${tc !== null ? ' on' : ''}`} onClick={() => { if (!pro) { openPaywall('tcOverlay'); return; } setTc(tc === null ? 0 : null); }}>{tc === null ? 'Count: off' : `TC ${fmtTc(tc)}`}<Lock show={!pro} /></button>
        <input className="slider" type="range" min={-6} max={6} step={1} value={tc ?? 0} disabled={tc === null} onChange={(e) => setTc(Number(e.target.value))} aria-label="true count" />
      </div>
      <p className="hint">{tc === null
        ? <>Dealer upcard across the top. Tap any cell for the play and why. <span className="dot inline" /> = missed last time. Turn on Count to see index plays.</>
        : <>At TC {fmtTc(tc)}: <span className="devkey" /> = play changes from basic, <span className="idxkey" /> = has an index. <button className="linkbtn" onClick={() => openGuide(0)}>How deviations work</button></>}</p>
      <ChartGrid chart={chart} kind={kind} onTap={(row, up) => setSel({ row, up })} selected={sel} marks={marks} overlay={overlay} />
      <Legend />
      </>}
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? `${rowLabel(hk, sel.row)} vs dealer ${upLabel(sel.up)}${tc !== null ? ` · TC ${fmtTc(tc)}` : ''}` : ''}>
        {sel && code && (
          <>
            <div className={`play-pill c-${code}`}>{CODE_NAME[code]}</div>
            {tc !== null && basicCode !== code && <p className="muted">Basic strategy: {CODE_NAME[basicCode!]}. At TC {fmtTc(tc)} the index play changes it.</p>}
            <p className="reason">{explain(hk, sel.row, sel.up, basicCode!, chart.rules)}</p>
            {cellPlays.map((p) => (
              <div key={p.id} className="idx-card">
                <div><b>{p.group === 'Fab4' ? 'Fab 4' : 'Illustrious 18'} #{p.rank}</b> · index <b>{fmtTc(p.index)}</b></div>
                <div>{playName(p)}: {describeIndex(p)}.</div>
              </div>
            ))}
            {cellPlays.length > 0 && <button className="linkbtn" onClick={() => openGuide(2)}>What does an index mean?</button>}
            {tally && <p className="muted">Your record here: {tally.correct}/{tally.n} ({pct(tally)}%)</p>}
          </>
        )}
      </Sheet>
    </div>
  );
}

function IndexList({ store, chart, openGuide }: ModeProps) {
  const rules = chart.rules;
  const list = activeIndexPlays(rules);
  const groups: [string, typeof list][] = [
    ['Insurance', list.filter((x) => x.play.group === 'Insurance')],
    ['Illustrious 18', list.filter((x) => x.play.group === 'I18')],
    ['Fab 4 surrenders', list.filter((x) => x.play.group === 'Fab4')],
  ];
  return (
    <div className="idx-list">
      <button className="btn wide guide-btn" onClick={() => openGuide(0)}>📘 How deviations work</button>
      <button className="i18-card" onClick={() => openGuide(3)}>
        <div><b>What are the Illustrious 18 &amp; Fab 4?</b></div>
        <div className="muted small">Schlesinger's most valuable index plays, ranked by value. Insurance is #1 ›</div>
      </button>
      <p className="hint">Hi-Lo index plays for <b>{rules.h17 ? 'H17' : 'S17'}</b>{rules.decks <= 2 ? ` · ${rules.decks} deck${rules.decks > 1 ? 's' : ''}` : ''}. Make the play at TC ≥ index, otherwise {''}
        the other way. TC = running count ÷ decks left, compared exactly (rounded down).</p>
      {rules.decks <= 2 && <p className="note">Reliable free single/double-deck I18 tables aren't published, so this uses the multi-deck set. Entries that contradict {rules.decks}-deck basic strategy are switched off.</p>}
      {groups.map(([title, items]) => (
        <div key={title}>
          <h3>{title}</h3>
          {items.map(({ play: p, app }) => {
            const t = devTally(store, p.id);
            return (
              <div key={p.id} className={`idx-row${app.ok ? '' : ' off'}`}>
                <div className="idx-num">{fmtTc(p.index)}</div>
                <div className="idx-main">
                  <div className="idx-name">{playName(p)} <span className="muted">· {ACT_VERB[p.above]}</span></div>
                  <div className="muted small">{app.ok ? describeIndex(p) : app.note}</div>
                </div>
                <div className="idx-acc muted small">{t ? `${Math.round((100 * t.correct) / t.n)}% · ${t.n}` : ''}</div>
              </div>
            );
          })}
        </div>
      ))}
      <p className="muted small">Source: Don Schlesinger, <i>Blackjack Attack</i> (I18 + Fab 4), via Wizard of Odds; H17 values per published H17 tables. See reference/deviations in the repo.</p>
    </div>
  );
}
