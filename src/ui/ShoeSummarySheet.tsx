import type { ShoeSummary } from '../game/shoeSummary';
import { pairPct } from '../game/shoeSummary';
import { Sheet } from './Sheet';

const Row = ({ label, p }: { label: string; p: { n: number; correct: number } }) => (
  <div className="sum-row"><span>{label}</span><span><b>{pairPct(p)}%</b> <span className="muted">({p.correct}/{p.n})</span></span></div>
);

/** Shown when the cut card is reached and the shoe is about to be reshuffled. */
export function ShoeSummarySheet({ summary, onContinue }: { summary: ShoeSummary | null; onContinue: () => void }) {
  return (
    <Sheet open={!!summary} onClose={onContinue} title="Shoe finished — reshuffling">
      {summary && (<>
        <div className="stat-cards">
          <div className="stat"><div className="big">{summary.hands}</div><div className="muted">hands played</div></div>
          <div className="stat"><div className="big">{summary.accuracy === null ? '–' : `${summary.accuracy}%`}</div><div className="muted">decision accuracy ({summary.decisions})</div></div>
        </div>
        <h3 className="set-h">Biggest weak spots</h3>
        {summary.weak.length === 0
          ? <p className="muted">{summary.decisions ? 'No misses this shoe. Clean!' : 'No decisions this shoe.'}</p>
          : summary.weak.map((w) => <div key={w.label} className="sum-row"><span>{w.label}</span><span className="muted">missed {w.missed} of {w.n}</span></div>)}
        {(summary.rc || summary.tc || summary.bet || summary.dev) && <h3 className="set-h">Counting</h3>}
        {summary.rc && <Row label="Running count" p={summary.rc} />}
        {summary.tc && <Row label="True count" p={summary.tc} />}
        {summary.bet && <Row label="Bet sizing" p={summary.bet} />}
        {summary.dev && <Row label="Index plays" p={summary.dev} />}
        <button className="btn deal" onClick={onContinue}>Shuffle &amp; keep going</button>
      </>)}
    </Sheet>
  );
}
