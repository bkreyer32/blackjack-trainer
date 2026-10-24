import { useEffect, useRef, useState } from 'react';
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
import { Keypad, fmtSigned } from '../ui/Keypad';
import { runningCount, decksRemaining, exactTrueCount, trueCount, gradeTrueCount, rampBet, betOptions } from '../count/hilo';
import { recordErr, recordDev } from '../stats/stats';
import { correctPlay, insuranceCorrect } from '../engine/deviations';
import type { Grader } from '../game/game';
import { CountFeedback } from './Count';
import { ACTION_LABEL, type ModeProps } from './common';
import { HelpBubble } from '../ui/HelpBubble';
import { DiscardTray } from '../ui/DiscardTray';
import { discardsAfterRound } from '../game/tray';
import { DEAL_MS, fullView, revealFrames, viewOf, type View } from '../game/reveal';
import { preHandStep, afterQuizStep, FLAT_BET } from '../count/flow';

function totalLabel(cards: GameState['dealer']) {
  const v = handValue(cards);
  return v.soft && v.total < 21 ? `soft ${v.total}` : String(v.total);
}

const RESULT: Record<string, string> = { win: 'Win', lose: 'Lose', push: 'Push', blackjack: 'Blackjack!', surrender: 'Surrendered', bust: 'Bust' };

export function Play({ store, mutate, chart, openGuide }: ModeProps) {
  const rules = chart.rules;
  const shoeRef = useRef<Shoe | null>(null);
  if (!shoeRef.current || shoeRef.current.decks !== rules.decks) shoeRef.current = new Shoe(rules.decks);
  const shoe = shoeRef.current;
  const [g, setG] = useState<GameState>(initialGame);
  const [targeted, setTargeted] = useState<CellRef | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const cs = store.settings.count;
  const counting = cs.countInPlay;
  const rcRef = useRef(0); // running count of every card seen from this shoe (completed rounds)
  const handsRef = useRef(0);
  const [pre, setPre] = useState<null | 'rc' | 'tc' | 'bet' | 'review'>(null);
  const [entry, setEntry] = useState('');
  const [rcAns, setRcAns] = useState<number | null>(null);
  const [countFb, setCountFb] = useState<{ rc: number; rcAns: number; tcAns: number | null; decks: number; cardsLeft: number } | null>(null);
  const [betFb, setBetFb] = useState<{ bet: number; want: number; tc: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const devOn = counting && cs.deviations;
  const [pendingIns, setPendingIns] = useState<GameState | null>(null);
  const [insFb, setInsFb] = useState<{ took: boolean; right: boolean; tc: number; net: number } | null>(null);
  // Card-by-card reveal: the game state is computed at once, the table shows it frame by frame.
  const dealMs = DEAL_MS[store.settings.dealSpeed ?? 'normal'];
  const [discarded, setDiscarded] = useState(0); // cards in the discard tray (completed rounds only)
  const [anim, setAnim] = useState<{ frames: View[]; i: number } | null>(null);
  const pendingRound = useRef<GameState | null>(null);
  const animating = !!anim && anim.i < anim.frames.length - 1;
  const show = (prev: GameState | null, next: GameState) => {
    setG(next);
    setAnim({ frames: dealMs > 0 ? revealFrames(prev, next) : [fullView(next)], i: 0 });
  };
  const skip = () => { if (anim && animating) setAnim({ ...anim, i: anim.frames.length - 1 }); };

  /** Exact true count from every card seen so far (completed rounds + face-up cards of this round). */
  const liveTc = (st: GameState) => {
    const visible = [st.dealer[0], ...st.hands.flatMap((h) => h.cards)].filter(Boolean);
    return (rcRef.current + runningCount(visible)) / decksRemaining(shoe.remaining);
  };
  const grader: Grader | undefined = devOn
    ? (cards, up, av, st) => {
        const tc = liveTc(st);
        const r = correctPlay(cards, up, rules, av, tc);
        return { action: r.action, basic: r.basic, isDeviation: r.isDeviation, reason: r.reason, indexId: r.index?.id, tc };
      }
    : undefined;

  const startRound = (bet: number) => {
    let target: CellRef | null = null;
    if (!counting && Math.random() < store.settings.focus) {
      target = pickWeighted(allCells(), (c) => cellWeight(combinedTally(store, cellKey(c))));
    }
    if (shoe.needsShuffle) setDiscarded(0); // deal() reshuffles: tray empties
    setTargeted(target);
    setShowWhy(false);
    const s = deal(shoe, rules, target, Math.random, bet);
    setInsFb(null);
    if (devOn && upOf(s.dealer[0]) === 11) {
      // Offer insurance before the peek: show the deal with the hole card down and no result yet.
      setPendingIns(s);
      show(null, { ...s, phase: 'player', holeHidden: true, message: undefined, hands: s.hands.map((h) => ({ ...h, result: undefined, done: false })) });
      return;
    }
    show(null, s);
    if (s.phase === 'done') pendingRound.current = s;
  };

  const answerInsurance = (took: boolean) => {
    const s = pendingIns!;
    const tc = liveTc(s);
    const right = took === insuranceCorrect(tc);
    const dealerBJ = s.dealer.length === 2 && handValue(s.dealer).total === 21;
    const insNet = took ? (dealerBJ ? s.hands[0].bet : -s.hands[0].bet / 2) : 0;
    setInsFb({ took, right, tc, net: insNet });
    setPendingIns(null);
    mutate((st) => { recordDev(st.dev.play, 'ins', right); st.play.net += insNet; });
    show(g, s);
    if (s.phase === 'done') pendingRound.current = s;
  };

  /** Called when a round finishes: book stats and add every (now face-up) card to the count. */
  const roundOver = (s: GameState) => {
    rcRef.current += runningCount([...s.dealer, ...s.hands.flatMap((h) => h.cards)]);
    setDiscarded(discardsAfterRound(shoe.total, shoe.remaining)); // the round's cards go to the tray now
    handsRef.current++;
    mutate((st) => { st.play.hands++; st.play.net += s.roundNet; });
  };

  const onDeal = () => {
    if (animating) return;
    if (!counting) return startRound(1);
    setCountFb(null); setBetFb(null); setNotice(null);
    if (shoe.needsShuffle) {
      shoe.shuffle();
      setDiscarded(0);
      rcRef.current = 0;
      handsRef.current = 0;
      setNotice('Shuffle! New shoe — count resets to 0.');
    }
    setEntry('');
    const step = preHandStep(handsRef.current, cs.playQuizEvery, cs.betSizing);
    if (step === 'deal') { setPre(null); startRound(FLAT_BET); }
    else setPre(step);
  };

  const decksLeft = decksRemaining(shoe.remaining);
  const submitRc = (n: number) => {
    setRcAns(n);
    setEntry('');
    if (cs.quizTc) setPre('tc');
    else finishQuiz(n, null);
  };
  const finishQuiz = (rcA: number, tcA: number | null) => {
    const rc = rcRef.current;
    mutate((st) => {
      recordErr(st.count.play.rc, rcA, rc, rcA === rc);
      if (tcA !== null) recordErr(st.count.play.tc, tcA, exactTrueCount(rc, decksLeft), gradeTrueCount(tcA, rc, decksLeft, cs.tcConvention, cs.tcTolerance));
    });
    setCountFb({ rc, rcAns: rcA, tcAns: tcA, decks: decksLeft, cardsLeft: shoe.remaining });
    setPre(afterQuizStep(cs.betSizing));
  };
  const chooseBet = (bet: number) => {
    const tc = trueCount(rcRef.current, decksLeft, cs.tcConvention);
    const want = rampBet(tc, cs.spread);
    setBetFb({ bet, want, tc });
    mutate((st) => {
      const b = st.count.play.bet;
      b.n++;
      if (bet === want) b.correct++;
      b.absErr += Math.abs(bet - want);
    });
    setPre(null);
    startRound(bet);
  };

  const onAct = (a: Action) => {
    const s = act(g, a, chart, rules, shoe, grader);
    const fb = s.feedback[s.feedback.length - 1];
    setShowWhy(!fb.correct);
    show(g, s);
    setInsFb(null);
    mutate((st) => {
      record(st.play, fb.cell, fb.correct);
      if (fb.indexId) recordDev(st.dev.play, fb.indexId, fb.correct);
    });
    if (s.phase === 'done') pendingRound.current = s;
  };

  // Step through frames; book the round (stats + count) only once every card has landed.
  useEffect(() => {
    if (!anim) return;
    if (anim.i < anim.frames.length - 1) {
      const t = setTimeout(() => setAnim((a) => (a ? { ...a, i: a.i + 1 } : a)), dealMs);
      return () => clearTimeout(t);
    }
    const s = pendingRound.current;
    if (s) { pendingRound.current = null; roundOver(s); }
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const av = availability(g, rules);
  const enabled = (a: Action) =>
    g.phase === 'player' && !pendingIns && !animating &&
    (a === 'hit' ? av.canHit : a === 'stand' ? true : a === 'double' ? av.canDouble : a === 'split' ? av.canSplit : av.canSurrender);
  const last = g.feedback[g.feedback.length - 1];
  const lastCode = last ? codeAt(chart, last.cell) : null;
  const acc = store.play.kinds;
  const totalN = acc.hard.n + acc.soft.n + acc.pair.n;
  const totalC = acc.hard.correct + acc.soft.correct + acc.pair.correct;
  const t = anim && animating ? viewOf(g, anim.frames[anim.i]) : g;
  const actions: Action[] = ['hit', 'stand', 'double', 'split', ...(rules.surrender === 'late' ? (['surrender'] as Action[]) : [])];

  return (
    <div className="screen play">
      {pre === 'rc' || pre === 'tc' ? <div className="flex1" /> : (<>
      <div className="scoreline with-help">
        <span>Accuracy {totalN ? Math.round((100 * totalC) / totalN) : '–'}%</span>
        <span className="tray-wrap">
          <DiscardTray discarded={discarded} total={shoe.total} cutRemaining={shoe.cutRemaining} />
          {counting && cs.showDecksLeft && <span className="tray-d">≈{decksLeft}D</span>}
        </span>
        <span>Net {store.play.net >= 0 ? '+' : ''}{store.play.net} u<HelpBubble id="scoreline" /></span>
      </div>
      <div className={`table${animating ? ' dealing' : ''}`} style={{ ['--deal-ms' as string]: `${Math.min(320, Math.round(dealMs * 0.7))}ms` }} onClick={skip}>
        <div className="zone">
          <div className="zone-label">
            Dealer {t.dealer.length > 0 && (t.holeHidden ? `· ${upLabel(upOf(t.dealer[0]))}` : `· ${totalLabel(t.dealer)}`)}
          </div>
          {t.dealer.length || g.phase !== 'idle' ? <CardRow cards={t.dealer} hideSecond={t.holeHidden} dealer /> : <div className="card-row placeholder">Tap Deal to start</div>}
        </div>
        <div className={`hands n${t.hands.length}`}>
          {t.hands.map((h, i) => (
            <div key={i} className={`zone hand${g.phase === 'player' && !animating && i === g.active ? ' active' : ''}`}>
              <div className="zone-label">
                {t.hands.length > 1 ? `Hand ${i + 1} · ` : 'You · '}{h.cards.length ? totalLabel(h.cards) : ''}{h.doubled && !animating ? ' · 2×' : ''}
                {h.result && !animating && <span className={`result r-${h.result}`}>{RESULT[h.result]}</span>}
              </div>
              <CardRow cards={h.cards} small={t.hands.length > 2} />
            </div>
          ))}
        </div>
        {animating && <div className="skip-hint">tap to skip</div>}
      </div>

      <div className="feedback-slot">
        {last && lastCode && (
          <div className={`feedback ${last.correct ? 'good' : 'bad'}`} onClick={() => setShowWhy(!showWhy)}>
            <div className="fb-title">
              {last.correct
                ? `✓ ${ACTION_LABEL[last.chosen]} is right${last.isDeviation ? ' — index play!' : ''}`
                : `✗ ${last.isDeviation ? 'Index play' : 'Basic strategy'}: ${ACTION_LABEL[last.best]}`}
              {!last.correct && <span className="muted"> (you: {ACTION_LABEL[last.chosen]})</span>}
            </div>
            {last.isDeviation && last.basic && last.tc !== undefined && (
              <div className="fb-dev">Basic says {ACTION_LABEL[last.basic]}, but at TC {fmtSigned(last.tc, 1)} the index play is {ACTION_LABEL[last.best]}.</div>
            )}
            <div className="fb-sub">{rowLabel(last.cell.kind, last.cell.row)} vs {upLabel(last.up)} → {CODE_NAME[lastCode]}{showWhy ? '' : ' · tap for why'}</div>
            {showWhy && <div className="fb-body">{last.reason ? `${last.reason}. ` : ''}{last.isDeviation ? '' : explain(last.cell.kind, last.cell.row, last.up, lastCode, rules)}</div>}
            {showWhy && last.reason && <button className="linkbtn" onClick={(e) => { e.stopPropagation(); openGuide(2); }}>How deviations work</button>}
          </div>
        )}
        {g.phase === 'done' && !animating && (
          <div className="round-msg">
            {g.message ? `${g.message} ` : ''}Round: {g.roundNet > 0 ? '+' : ''}{g.roundNet} u
            {g.feedback.length > 0 && ` · ${g.feedback.filter((f) => f.correct).length}/${g.feedback.length} correct`}
          </div>
        )}
        {targeted && g.phase !== 'idle' && <div className="target-tag">🎯 Weak-spot deal</div>}
        {counting && notice && <div className="target-tag">{notice}</div>}
        {insFb && (
          <div className={`betfb ${insFb.right ? 'ok' : 'no'}`}>
            {insFb.right ? '✓' : '✗'} {insFb.took ? 'Took' : 'Declined'} insurance at TC {fmtSigned(insFb.tc, 1)} — {insuranceCorrect(insFb.tc) ? 'insure at +3 or more' : 'only insure at TC +3 or more'}{insFb.took ? ` (${insFb.net > 0 ? '+' : ''}${insFb.net}u)` : ''}
          </div>
        )}
        {counting && cs.betSizing && betFb && (
          <div className={`betfb ${betFb.bet === betFb.want ? 'ok' : 'no'}`}>
            {betFb.bet === betFb.want ? '✓' : '✗'} Bet {betFb.bet}u{betFb.bet === betFb.want ? '' : ` · ramp says ${betFb.want}u`} at TC {fmtSigned(betFb.tc)}
          </div>
        )}
      </div>

      </>)}
      {pre === 'rc' || pre === 'tc' ? (
        <div className="actions">
          {pre === 'rc' ? (
            <><Keypad key="rc" value={entry} onChange={setEntry} onSubmit={submitRc} prompt="Count check: running count?" sub={`${handsRef.current} hands into this shoe`} />
            <div className="fb-help center"><HelpBubble id="countQuiz" label="Count check" /></div></>
          ) : (
            <Keypad key="tc" value={entry} onChange={setEntry} onSubmit={(n) => finishQuiz(rcAns!, n)} allowDecimal={cs.tcTolerance} prompt="True count?"
              sub={`${cs.showDecksLeft ? `Decks remaining ≈ ${decksLeft} · ` : ''}${cs.tcConvention === 'truncate' ? 'truncate toward 0' : cs.tcConvention}${cs.tcTolerance ? ' · ±0.5 ok' : ''}`} />
          )}
        </div>
      ) : pre === 'review' ? (
        <div className="actions">
          {countFb && <div className="feedback-slot"><CountFeedback fb={countFb} conv={cs.tcConvention} tol={cs.tcTolerance} /></div>}
          <div className="bet-label">Bet sizing is off · flat {FLAT_BET} unit</div>
          <button className="btn deal" onClick={() => { setPre(null); startRound(FLAT_BET); }}>Deal</button>
        </div>
      ) : pre === 'bet' ? (
        <div className="actions">
          {countFb && <div className="feedback-slot"><CountFeedback fb={countFb} conv={cs.tcConvention} tol={cs.tcTolerance} /></div>}
          <div className="bet-label">Your bet (units){cs.showDecksLeft ? ` · ≈${decksLeft} decks left` : ''}<HelpBubble id="bet" /></div>
          <div className="pad-row big">
            {betOptions(cs.spread).map((u) => <button key={u} className="btn act bet" onClick={() => chooseBet(u)}>{u}</button>)}
          </div>
        </div>
      ) : (
      <div className="actions">
        {pendingIns ? (
          <div className="pad">
            <div className="bet-label">Dealer shows an ace — insurance?{cs.showDecksLeft ? ` · ≈${decksLeft} decks left` : ''}<HelpBubble id="insurance" /></div>
            <div className="pad-row big">
              <button className="btn act a-surrender" disabled={animating} onClick={() => answerInsurance(false)}>No insurance</button>
              <button className="btn act a-double" disabled={animating} onClick={() => answerInsurance(true)}>Insure</button>
            </div>
          </div>
        ) : g.phase === 'player' ? (
          <div className="with-help-row"><div className="flex1"><ActionPad actions={actions} enabled={enabled} onAct={onAct} /></div><HelpBubble id="actions" label="Action buttons" /></div>
        ) : (
          <div className="with-help-row"><button className="btn deal flex1" disabled={animating} onClick={onDeal}>{counting && cs.betSizing ? 'Next hand (bet)' : 'Deal'}</button><HelpBubble id="deal" label="Deal" /></div>
        )}
      </div>
      )}
    </div>
  );
}
