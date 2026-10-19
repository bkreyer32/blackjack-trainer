import { useMemo, useState } from 'react';
import type { Action, Card, HandKind, Rank, Suit, Up } from '../engine/types';
import { upLabel } from '../engine/types';
import { CardRow, CardView } from '../ui/CardView';
import { bestAction, codeAt, cellKey, type CellRef } from '../engine/decide';
import { CODE_NAME, explain, rowLabel } from '../engine/explain';
import { cardsForCell } from '../game/game';
import { allCells, cellWeight, combinedTally, pickWeighted, record } from '../stats/stats';
import { ACTION_LABEL, type ModeProps } from './common';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
function toCard(v: number): Card {
  const tens: Rank[] = ['T', 'J', 'Q', 'K'];
  const rank: Rank = v === 11 ? 'A' : v === 10 ? tens[Math.floor(Math.random() * 4)] : (String(v) as Rank);
  return { rank, suit: SUITS[Math.floor(Math.random() * 4)] };
}

interface Q { cell: CellRef; cards: Card[]; up: Card }

function makeQ(props: ModeProps, prev?: CellRef): Q {
  const cells = allCells(props.store.settings.drillFilter).filter((c) => !prev || cellKey(c) !== cellKey(prev));
  const cell = pickWeighted(cells, (c) => cellWeight(combinedTally(props.store, cellKey(c))));
  const [a, b] = cardsForCell(cell, Math.random);
  return { cell, cards: [toCard(a), toCard(b)], up: toCard(cell.up) };
}

export function Drill(props: ModeProps) {
  const { store, mutate, chart } = props;
  const [q, setQ] = useState<Q>(() => makeQ(props));
  const [answer, setAnswer] = useState<Action | null>(null);
  const [streak, setStreak] = useState(0);
  const [session, setSession] = useState({ n: 0, c: 0 });
  const surr = chart.rules.surrender === 'late';
  const av = { canDouble: true, canSplit: q.cell.kind === 'pair', canSurrender: surr };
  const code = codeAt(chart, q.cell);
  const best = useMemo(() => bestAction(chart, q.cards, q.cell.up, av).action, [q, chart, surr]);
  const choose = (a: Action) => {
    if (answer) return;
    const ok = a === best;
    setAnswer(a);
    setStreak(ok ? streak + 1 : 0);
    setSession({ n: session.n + 1, c: session.c + (ok ? 1 : 0) });
    mutate((s) => record(s.drill, q.cell, ok));
  };
  const next = () => { setAnswer(null); setQ(makeQ(props, q.cell)); };
  const ok = answer === best;
  const actions: Action[] = ['hit', 'stand', 'double', 'split', ...(surr ? (['surrender'] as Action[]) : [])];
  const setFilter = (f: 'all' | HandKind) => { mutate((s) => { s.settings.drillFilter = f; }); setAnswer(null); setQ(makeQ({ ...props, store: { ...store, settings: { ...store.settings, drillFilter: f } } })); };

  return (
    <div className="screen play">
      <div className="seg small">
        {(['all', 'hard', 'soft', 'pair'] as const).map((f) => (
          <button key={f} className={store.settings.drillFilter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'pair' ? 'Pairs' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="scoreline">
        <span>Session {session.c}/{session.n}</span>
        <span>🔥 {streak}</span>
      </div>
      <div className="table">
        <div className="zone">
          <div className="zone-label">Dealer</div>
          <div className="card-row"><CardView card={q.up} /><CardView hidden /></div>
        </div>
        <div className="zone">
          <div className="zone-label">You · {rowLabel(q.cell.kind, q.cell.row)}</div>
          <CardRow cards={q.cards} />
        </div>
      </div>
      <div className="feedback-slot">
        {answer && (
          <div className={`feedback ${ok ? 'good' : 'bad'}`} onClick={next}>
            <div className="fb-title">{ok ? `✓ ${ACTION_LABEL[best]}` : `✗ Correct play: ${ACTION_LABEL[best]}`}{!ok && <span className="muted"> (you chose {ACTION_LABEL[answer]})</span>}</div>
            <div className="fb-body">{CODE_NAME[code]} — {explain(q.cell.kind, q.cell.row, q.cell.up as Up, code, chart.rules)}</div>
            <div className="fb-hint">vs dealer {upLabel(q.cell.up)} · tap for next</div>
          </div>
        )}
      </div>
      <div className="actions">
        {answer ? (
          <button className="btn deal" onClick={next}>Next ›</button>
        ) : (
          <ActionPad actions={actions} enabled={() => true} onAct={choose} />
        )}
      </div>
    </div>
  );
}

export function ActionPad({ actions, enabled, onAct }: { actions: Action[]; enabled: (a: Action) => boolean; onAct: (a: Action) => void }) {
  const top = actions.filter((a) => a === 'hit' || a === 'stand');
  const rest = actions.filter((a) => a !== 'hit' && a !== 'stand');
  return (
    <div className="pad">
      <div className="pad-row">
        {rest.map((a) => (
          <button key={a} className={`btn act a-${a}`} disabled={!enabled(a)} onClick={() => onAct(a)}>{ACTION_LABEL[a]}</button>
        ))}
      </div>
      <div className="pad-row big">
        {top.map((a) => (
          <button key={a} className={`btn act a-${a}`} disabled={!enabled(a)} onClick={() => onAct(a)}>{ACTION_LABEL[a]}</button>
        ))}
      </div>
    </div>
  );
}
