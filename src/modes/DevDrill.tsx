import { useMemo, useState } from 'react';
import type { Action, Card, Rank, Suit, Up } from '../engine/types';
import { upLabel } from '../engine/types';
import { CardRow, CardView } from '../ui/CardView';
import { activeIndexPlays, correctPlay, insuranceCorrect, describeIndex, playName, fmtTc, type IndexPlay } from '../engine/deviations';
import { chartFor } from '../engine/strategy';
import { codeAt, type Availability } from '../engine/decide';
import { cardsForCell } from '../game/game';
import { cellWeight, devTally, pickWeighted, recordDev } from '../stats/stats';
import { ActionPad, DrillFilter } from './Drill';
import { ACTION_LABEL, type ModeProps } from './common';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const rnd = (n: number) => Math.floor(Math.random() * n);
function card(v: number): Card {
  const tens: Rank[] = ['T', 'J', 'Q', 'K'];
  return { rank: v === 11 ? 'A' : v === 10 ? tens[rnd(4)] : (String(v) as Rank), suit: SUITS[rnd(4)] };
}

interface DQ { play: IndexPlay; tc: number; cards: Card[]; up: Card; av: Availability; note?: string }

/** Offsets around the index: mostly at/just above/just below it. */
const OFFSETS: [number, number][] = [[-2, 1], [-1, 3], [0, 3], [1, 2], [2, 1]];

function threeCards(total: number): number[] {
  for (let tries = 0; tries < 50; tries++) {
    const a = 2 + rnd(8);
    const b = 2 + rnd(8);
    const c = total - a - b;
    if (c >= 2 && c <= 10) return [a, b, c];
  }
  return [2, 4, total - 6];
}

function makeDQ(props: ModeProps, prevId?: string): DQ {
  const rules = props.chart.rules;
  const list = activeIndexPlays(rules).filter((x) => x.app.ok).map((x) => x.play).filter((p) => p.id !== prevId);
  const play = pickWeighted(list, (p) => cellWeight(devTally(props.store, p.id)));
  const off = pickWeighted(OFFSETS, (o) => o[1]);
  const tc = play.index + off[0];
  const surr = rules.surrender === 'late';
  if (play.kind === 'insurance') {
    let a = 2 + rnd(9), b = 2 + rnd(9);
    if (a + b === 21) b = 5;
    return { play, tc, cards: [card(a), card(b)], up: card(11), av: { canDouble: false, canSplit: false, canSurrender: false } };
  }
  if (play.kind === 'pair') return { play, tc, cards: [card(10), card(10)], up: card(play.up), av: { canDouble: true, canSplit: true, canSurrender: surr } };
  const base = codeAt(chartFor(rules), { kind: 'hard', row: play.row, up: play.up });
  const hasFab = activeIndexPlays(rules).some((x) => x.app.ok && x.play.group === 'Fab4' && x.play.row === play.row && x.play.up === play.up);
  // Stand/hit indices on cells where surrender would come first: drill the after-a-hit (3-card) version.
  if (play.group === 'I18' && surr && (base.startsWith('R') || hasFab) && (play.above === 'S' || play.above === 'H')) {
    return { play, tc, cards: threeCards(play.row).map(card), up: card(play.up), av: { canDouble: false, canSplit: false, canSurrender: false }, note: 'You already took a card, so surrender and double are off.' };
  }
  const [a, b] = cardsForCell({ kind: 'hard', row: play.row, up: play.up }, Math.random);
  return { play, tc, cards: [card(a), card(b)], up: card(play.up), av: { canDouble: true, canSplit: false, canSurrender: surr } };
}

export function DevDrill(props: ModeProps) {
  const { mutate, chart, openGuide } = props;
  const rules = chart.rules;
  const [q, setQ] = useState<DQ>(() => makeDQ(props));
  const [answer, setAnswer] = useState<string | null>(null);
  const [session, setSession] = useState({ n: 0, c: 0 });
  const upV = (q.up.rank === 'A' ? 11 : ['T', 'J', 'Q', 'K'].includes(q.up.rank) ? 10 : Number(q.up.rank)) as Up;
  const res = useMemo(() => (q.play.kind === 'insurance' ? null : correctPlay(q.cards, upV, rules, q.av, q.tc)), [q, rules, upV]);
  const want = q.play.kind === 'insurance' ? (insuranceCorrect(q.tc) ? 'insure' : 'no') : res!.action;
  const basic = q.play.kind === 'insurance' ? 'no' : res!.basic;
  const isDev = want !== basic;
  const choose = (a: string) => {
    if (answer) return;
    const ok = a === want;
    setAnswer(a);
    setSession({ n: session.n + 1, c: session.c + (ok ? 1 : 0) });
    mutate((s) => recordDev(s.dev.drill, q.play.id, ok));
  };
  const next = () => { setAnswer(null); setQ(makeDQ(props, q.play.id)); };
  const label = (a: string) => (a === 'insure' ? 'Insure' : a === 'no' ? 'No insurance' : ACTION_LABEL[a as Action]);
  const ok = answer === want;
  const actions: Action[] = ['hit', 'stand', 'double', 'split', ...(rules.surrender === 'late' ? (['surrender'] as Action[]) : [])];
  const enabled = (a: Action) => (a === 'double' ? q.av.canDouble : a === 'split' ? q.av.canSplit : a === 'surrender' ? q.av.canSurrender : true);

  return (
    <div className="screen play">
      <DrillFilter {...props} />
      <div className="scoreline"><span>Index drill {session.c}/{session.n}</span><button className="linkbtn" onClick={() => openGuide(0)}>How deviations work</button></div>
      <div className="table">
        <div className="tc-badge">True count <b>{fmtTc(q.tc)}</b></div>
        <div className="zone">
          <div className="zone-label">Dealer</div>
          <div className="card-row"><CardView card={q.up} /><CardView hidden /></div>
        </div>
        <div className="zone">
          <div className="zone-label">You · {q.play.kind === 'pair' ? '10,10' : `hard ${q.cards.reduce((t, c) => t + (c.rank === 'A' ? 11 : ['T', 'J', 'Q', 'K'].includes(c.rank) ? 10 : Number(c.rank)), 0)}`}</div>
          <CardRow cards={q.cards} />
          {q.note && <div className="muted small">{q.note}</div>}
        </div>
      </div>
      <div className="feedback-slot">
        {answer && (
          <div className={`feedback ${ok ? 'good' : 'bad'}`} onClick={next}>
            <div className="fb-title">{ok ? `✓ ${label(want)}` : `✗ Correct: ${label(want)}`}{!ok && <span className="muted"> (you: {label(answer)})</span>}</div>
            <div className="fb-dev">{isDev
              ? `Basic says ${label(basic)}, but at TC ${fmtTc(q.tc)} the index play is ${label(want)}.`
              : `At TC ${fmtTc(q.tc)} basic strategy holds: ${label(want)}.`}</div>
            <div className="fb-body">{playName(q.play)} (index {fmtTc(q.play.index)}): {describeIndex(q.play)}.{res?.index && res.index.id !== q.play.id ? ` Here ${playName(res.index)} ${res.index.group === 'Fab4' ? '(Fab 4)' : ''} decides it.` : ''}</div>
            <div className="fb-hint">vs dealer {upLabel(upV)} · tap for next</div>
          </div>
        )}
      </div>
      <div className="actions">
        {answer ? (
          <button className="btn deal" onClick={next}>Next ›</button>
        ) : q.play.kind === 'insurance' ? (
          <div className="pad"><div className="bet-label">Dealer shows an ace. Insurance?</div><div className="pad-row big">
            <button className="btn act a-surrender" onClick={() => choose('no')}>No insurance</button>
            <button className="btn act a-double" onClick={() => choose('insure')}>Insure</button>
          </div></div>
        ) : (
          <ActionPad actions={actions} enabled={enabled} onAct={choose} />
        )}
      </div>
    </div>
  );
}
