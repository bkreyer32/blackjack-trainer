import { useRef, useState } from 'react';
import type { Action } from '../engine/types';
import { upLabel } from '../engine/types';
import { handValue, upOf } from '../engine/hand';
import { CardRow } from '../ui/CardView';
import { Shoe } from '../game/shoe';
import { act, availability, deal, initialGame, type GameState } from '../game/game';
import { codeAt, cellKey, type CellRef } from '../engine/decide';
import { CODE_NAME, explain, rowLabel } from '../engine/explain';
import { allCells, cellWeight, combinedTally, pickWeighted, record } from '../stats/stats';
import { ActionPad } from './Drill';
import { ACTION_LABEL, type ModeProps } from './common';

function totalLabel(cards: GameState['dealer']) {
  const v = handValue(cards);
  return v.soft && v.total < 21 ? `soft ${v.total}` : String(v.total);
}

const RESULT: Record<string, string> = { win: 'Win', lose: 'Lose', push: 'Push', blackjack: 'Blackjack!', surrender: 'Surrendered', bust: 'Bust' };

export function Play({ store, mutate, chart }: ModeProps) {
  const rules = chart.rules;
  const shoeRef = useRef<Shoe | null>(null);
  if (!shoeRef.current || shoeRef.current.decks !== rules.decks) shoeRef.current = new Shoe(rules.decks);
  const shoe = shoeRef.current;
  const [g, setG] = useState<GameState>(initialGame);
  const [targeted, setTargeted] = useState<CellRef | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const onDeal = () => {
    let target: CellRef | null = null;
    if (Math.random() < store.settings.focus) {
      target = pickWeighted(allCells(), (c) => cellWeight(combinedTally(store, cellKey(c))));
    }
    setTargeted(target);
    setShowWhy(false);
    const s = deal(shoe, rules, target);
    setG(s);
    if (s.phase === 'done') mutate((st) => { st.play.hands++; st.play.net += s.roundNet; });
  };

  const onAct = (a: Action) => {
    const s = act(g, a, chart, rules, shoe);
    const fb = s.feedback[s.feedback.length - 1];
    setShowWhy(!fb.correct);
    setG(s);
    mutate((st) => {
      record(st.play, fb.cell, fb.correct);
      if (s.phase === 'done') { st.play.hands++; st.play.net += s.roundNet; }
    });
  };

  const av = availability(g, rules);
  const enabled = (a: Action) =>
    g.phase === 'player' &&
    (a === 'hit' ? av.canHit : a === 'stand' ? true : a === 'double' ? av.canDouble : a === 'split' ? av.canSplit : av.canSurrender);
  const last = g.feedback[g.feedback.length - 1];
  const lastCode = last ? codeAt(chart, last.cell) : null;
  const acc = store.play.kinds;
  const totalN = acc.hard.n + acc.soft.n + acc.pair.n;
  const totalC = acc.hard.correct + acc.soft.correct + acc.pair.correct;
  const actions: Action[] = ['hit', 'stand', 'double', 'split', ...(rules.surrender === 'late' ? (['surrender'] as Action[]) : [])];

  return (
    <div className="screen play">
      <div className="scoreline">
        <span>Accuracy {totalN ? Math.round((100 * totalC) / totalN) : '–'}%</span>
        <span>Shoe {Math.round((100 * shoe.remaining) / (rules.decks * 52))}%</span>
        <span>Net {store.play.net >= 0 ? '+' : ''}{store.play.net} u</span>
      </div>
      <div className="table">
        <div className="zone">
          <div className="zone-label">
            Dealer {g.dealer.length > 0 && (g.holeHidden ? `· ${upLabel(upOf(g.dealer[0]))}` : `· ${totalLabel(g.dealer)}`)}
          </div>
          {g.dealer.length ? <CardRow cards={g.dealer} hideSecond={g.holeHidden} /> : <div className="card-row placeholder">Tap Deal to start</div>}
        </div>
        <div className={`hands n${g.hands.length}`}>
          {g.hands.map((h, i) => (
            <div key={i} className={`zone hand${g.phase === 'player' && i === g.active ? ' active' : ''}`}>
              <div className="zone-label">
                {g.hands.length > 1 ? `Hand ${i + 1} · ` : 'You · '}{totalLabel(h.cards)}{h.doubled ? ' · 2×' : ''}
                {h.result && <span className={`result r-${h.result}`}>{RESULT[h.result]}</span>}
              </div>
              <CardRow cards={h.cards} small={g.hands.length > 2} />
            </div>
          ))}
        </div>
      </div>

      <div className="feedback-slot">
        {last && lastCode && (
          <div className={`feedback ${last.correct ? 'good' : 'bad'}`} onClick={() => setShowWhy(!showWhy)}>
            <div className="fb-title">
              {last.correct ? `✓ ${ACTION_LABEL[last.chosen]} is right` : `✗ Basic strategy: ${ACTION_LABEL[last.best]}`}
              {!last.correct && <span className="muted"> (you: {ACTION_LABEL[last.chosen]})</span>}
            </div>
            <div className="fb-sub">{rowLabel(last.cell.kind, last.cell.row)} vs {upLabel(last.up)} → {CODE_NAME[lastCode]}{showWhy ? '' : ' · tap for why'}</div>
            {showWhy && <div className="fb-body">{explain(last.cell.kind, last.cell.row, last.up, lastCode, rules)}</div>}
          </div>
        )}
        {g.phase === 'done' && (
          <div className="round-msg">
            {g.message ? `${g.message} ` : ''}Round: {g.roundNet > 0 ? '+' : ''}{g.roundNet} u
            {g.feedback.length > 0 && ` · ${g.feedback.filter((f) => f.correct).length}/${g.feedback.length} correct`}
          </div>
        )}
        {targeted && g.phase !== 'idle' && <div className="target-tag">🎯 Weak-spot deal</div>}
      </div>

      <div className="actions">
        {g.phase === 'player' ? (
          <ActionPad actions={actions} enabled={enabled} onAct={onAct} />
        ) : (
          <button className="btn deal" onClick={onDeal}>Deal</button>
        )}
      </div>
    </div>
  );
}
