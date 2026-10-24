import type { Chart } from '../engine/types';
import { upLabel } from '../engine/types';
import { handValue } from '../engine/hand';
import { codeAt } from '../engine/decide';
import { CODE_NAME, explain, rowLabel } from '../engine/explain';
import type { GameState } from '../game/game';
import { CardRow } from './CardView';
import { Sheet } from './Sheet';
import { ACTION_LABEL } from '../modes/common';
import { fmtSigned } from './Keypad';

const RESULT: Record<string, string> = { win: 'Win', lose: 'Lose', push: 'Push', blackjack: 'Blackjack', surrender: 'Surrendered', bust: 'Bust' };
const tot = (cards: GameState['dealer']) => { const v = handValue(cards); return v.soft && v.total < 21 ? `soft ${v.total}` : String(v.total); };

/** The finished hand: every card, each decision with the correct play and why. */
export function HandReview({ round, chart, open, onClose }: { round: GameState | null; chart: Chart; open: boolean; onClose: () => void }) {
  if (!round) return null;
  return (
    <Sheet open={open} onClose={onClose} title="Last hand">
      <div className="rv-zone">
        <div className="zone-label">Dealer · {tot(round.dealer)}</div>
        <CardRow cards={round.dealer} small />
      </div>
      {round.hands.map((h, i) => (
        <div key={i} className="rv-zone">
          <div className="zone-label">
            {round.hands.length > 1 ? `Hand ${i + 1}` : 'You'} · {tot(h.cards)}{h.doubled ? ' · doubled' : ''}
            {h.result && <span className={`result r-${h.result}`}>{RESULT[h.result]}</span>}
          </div>
          <CardRow cards={h.cards} small />
        </div>
      ))}
      <h3 className="set-h">Your decisions</h3>
      {round.feedback.length === 0 && <p className="muted">No decisions this hand — it was settled on the deal.</p>}
      {round.feedback.map((f, k) => {
        const code = codeAt(chart, f.cell);
        return (
          <div key={k} className={`rv-dec ${f.correct ? 'good' : 'bad'}`}>
            <div className="rv-dec-head">
              <b>{k + 1}. {rowLabel(f.cell.kind, f.cell.row)} vs {upLabel(f.up)}</b>
              <span>{f.correct ? '✓' : '✗'}</span>
            </div>
            <CardRow cards={f.cards} small />
            <div>You chose <b>{ACTION_LABEL[f.chosen]}</b>{f.correct ? ' — correct.' : <> — the correct play was <b>{ACTION_LABEL[f.best]}</b>.</>}</div>
            {f.isDeviation && f.basic && f.tc !== undefined && (
              <div className="fb-dev">Basic says {ACTION_LABEL[f.basic]}, but at TC {fmtSigned(f.tc, 1)} the index play is {ACTION_LABEL[f.best]}.</div>
            )}
            <div className="muted small">{f.reason ? `${f.reason}. ` : ''}{f.isDeviation ? '' : `${CODE_NAME[code]}: ${explain(f.cell.kind, f.cell.row, f.up, code, chart.rules)}`}</div>
          </div>
        );
      })}
    </Sheet>
  );
}
