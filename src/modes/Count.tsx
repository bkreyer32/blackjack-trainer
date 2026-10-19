import { useEffect, useRef, useState } from 'react';
import type { Card } from '../engine/types';
import { CardView } from '../ui/CardView';
import { Keypad, fmtSigned } from '../ui/Keypad';
import { Shoe } from '../game/shoe';
import { hiLo, runningCount, decksRemaining, exactTrueCount, trueCount, gradeTrueCount, TC_CONVENTION_LABEL, RAMPS, type TcConvention } from '../count/hilo';
import { scriptRound, type RoundEvent } from '../count/rounds';
import { recordErr, type CountSettings } from '../stats/stats';
import type { ModeProps } from './common';
import { HelpBubble } from '../ui/HelpBubble';
import type { HelpId } from '../ui/help';

type Sub = 'flash' | 'rounds' | 'play';

export function Count(props: ModeProps) {
  const [sub, setSub] = useState<Sub>(() => (sessionStorage.getItem('count-sub') as Sub) || 'flash');
  useEffect(() => { sessionStorage.setItem('count-sub', sub); }, [sub]);
  return (
    <div className="screen play">
      <div className="seg">
        {(['flash', 'rounds', 'play'] as Sub[]).map((s) => (
          <button key={s} className={sub === s ? 'on' : ''} onClick={() => setSub(s)}>
            {s === 'flash' ? 'Flash' : s === 'rounds' ? 'Rounds' : 'In Play'}
          </button>
        ))}
      </div>
      {sub === 'flash' && <Flash {...props} />}
      {sub === 'rounds' && <Rounds {...props} />}
      {sub === 'play' && <InPlay {...props} />}
    </div>
  );
}

function useCountSettings({ store, mutate }: ModeProps) {
  const cs = store.settings.count;
  const set = (patch: Partial<CountSettings>) => mutate((s) => { s.settings.count = { ...s.settings.count, ...patch }; });
  return [cs, set] as const;
}

function SpeedSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="opt">
      <div className="opt-label">Speed: <b>{value.toFixed(1)} s</b> per card</div>
      <input className="slider" type="range" min={0.3} max={3} step={0.1} value={value}
        onChange={(e) => onChange(Number(e.target.value))} aria-label="seconds per card" />
      <div className="slider-scale"><span>0.3 s (fast)</span><span>3 s</span></div>
    </div>
  );
}

function Seg<T extends string | number | boolean>({ label, value, options, onChange, help }: { label?: string; value: T; options: [T, string][]; onChange: (v: T) => void; help?: HelpId }) {
  return (
    <div className="opt">
      {label && <div className={`opt-label${help ? ' with-help' : ''}`}>{label}{help && <HelpBubble id={help} label={label} />}</div>}
      <div className="seg small">
        {options.map(([v, l]) => <button key={String(v)} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
      </div>
    </div>
  );
}

function makeFlashCards(n: number, decks: number): Card[] {
  const shoe = new Shoe(Math.max(1, decks || Math.ceil(n / 52)));
  if (decks) return shoe.cards.slice();
  return shoe.cards.slice(0, n);
}

/* ---------------- Flash drill ---------------- */
function Flash(props: ModeProps) {
  const { store, mutate } = props;
  const [cs, set] = useCountSettings(props);
  const [phase, setPhase] = useState<'setup' | 'run' | 'answer' | 'result'>('setup');
  const [cards, setCards] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const [entry, setEntry] = useState('');
  const [last, setLast] = useState<{ answer: number; actual: number } | null>(null);
  const [review, setReview] = useState(false);

  useEffect(() => {
    if (phase !== 'run') return;
    const ms = cs.speed * 1000;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), Math.max(120, ms * 0.82));
    const next = setTimeout(() => {
      if (i + 1 >= cards.length) setPhase('answer');
      else setI(i + 1);
    }, ms);
    return () => { clearTimeout(hide); clearTimeout(next); };
  }, [phase, i, cards.length, cs.speed]);

  const start = () => {
    setCards(makeFlashCards(cs.flashCards, cs.flashDecks));
    setI(0); setEntry(''); setReview(false); setPhase('run');
  };
  const submit = (n: number) => {
    const actual = runningCount(cards);
    const ok = n === actual;
    setLast({ answer: n, actual });
    setPhase('result');
    mutate((s) => {
      const f = s.count.flash;
      recordErr(f, n, actual, ok);
      if (ok && cards.length >= 10 && (f.bestSpeed === null || cs.speed < f.bestSpeed)) f.bestSpeed = cs.speed;
      f.history = [{ ts: Date.now(), cards: cards.length, speed: cs.speed, answer: n, actual }, ...f.history].slice(0, 30);
    });
  };
  const hist = store.count.flash.history;

  if (phase === 'run')
    return (
      <div className="flash-run" onClick={() => setPhase('setup')}>
        <div className="scoreline"><span>{i + 1} / {cards.length}</span><span>{cs.speed.toFixed(1)} s/card</span><span>tap to stop</span></div>
        <div className="flash-stage">{visible && <div key={i} className="flash-card"><CardView card={cards[i]} /></div>}</div>
        <div className="progress"><div style={{ width: `${(100 * (i + 1)) / cards.length}%` }} /></div>
      </div>
    );
  if (phase === 'answer')
    return (
      <div className="count-entry">
        <div className="flex1" />
        <Keypad value={entry} onChange={setEntry} onSubmit={submit} prompt="Running count?" sub={`${cards.length} cards at ${cs.speed.toFixed(1)} s`} />
      </div>
    );
  return (
    <div className="count-body">
      {phase === 'result' && last && (
        <div className={`feedback ${last.answer === last.actual ? 'good' : 'bad'}`}>
          <div className="fb-title">{last.answer === last.actual ? `✓ Correct: ${fmtSigned(last.actual)}` : `✗ Running count was ${fmtSigned(last.actual)}`}</div>
          <div className="fb-sub">You said {fmtSigned(last.answer)} · {cards.length} cards · {cs.speed.toFixed(1)} s/card{last.answer !== last.actual ? ` · off by ${Math.abs(last.answer - last.actual)}` : ''}</div>
          <button className="linkbtn" onClick={() => setReview(!review)}>{review ? 'Hide' : 'Review'} cards</button>
          {review && (
            <div className="review">
              {cards.reduce<{ c: Card; rc: number }[]>((acc, c) => [...acc, { c, rc: (acc.at(-1)?.rc ?? 0) + hiLo(c) }], []).map(({ c, rc }, k) => (
                <span key={k} className={`rv t${hiLo(c)}`}>{c.rank === 'T' ? '10' : c.rank}{c.suit}<sub>{fmtSigned(rc)}</sub></span>
              ))}
            </div>
          )}
        </div>
      )}
      {phase === 'setup' && <p className="hint">Hi-Lo: 2–6 = <b>+1</b>, 7–9 = <b>0</b>, 10–A = <b>−1</b>. Cards flash one at a time; keep the running count, then enter it.</p>}
      <SpeedSlider value={cs.speed} onChange={(v) => set({ speed: v })} />
      <Seg label="Cards" value={cs.flashDecks ? `d${cs.flashDecks}` : `n${cs.flashCards}`}
        options={[['n10', '10'], ['n20', '20'], ['n30', '30'], ['d1', '1 deck'], ['d2', '2 decks']]}
        onChange={(v) => (v.startsWith('d') ? set({ flashDecks: Number(v.slice(1)) }) : set({ flashDecks: 0, flashCards: Number(v.slice(1)) }))} />
      {cs.flashDecks > 0 && <p className="muted small">A full deck always counts to 0 — a good self-check.</p>}
      {hist.length > 0 && (
        <>
          <h3>History</h3>
          <div className="hist">
            {hist.slice(0, 8).map((h) => (
              <div key={h.ts} className={`hist-row ${h.answer === h.actual ? 'ok' : 'no'}`}>
                <span>{h.answer === h.actual ? '✓' : '✗'}</span>
                <span>{h.cards} cards</span>
                <span>{h.speed.toFixed(1)} s</span>
                <span>you {fmtSigned(h.answer)} / {fmtSigned(h.actual)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex1" />
      <div className="actions"><button className="btn deal" onClick={start}>{phase === 'result' ? 'Go again' : 'Start'}</button></div>
    </div>
  );
}

/* ---------------- Dealt rounds ---------------- */
interface TableView { seats: Card[][]; dealer: { card: Card; hidden?: boolean }[] }

function Rounds(props: ModeProps) {
  const { store, mutate, chart } = props;
  const rules = chart.rules;
  const [cs, set] = useCountSettings(props);
  const shoeRef = useRef<Shoe>(new Shoe(rules.decks));
  if (shoeRef.current.decks !== rules.decks) shoeRef.current = new Shoe(rules.decks);
  const shoe = shoeRef.current;
  const [phase, setPhase] = useState<'setup' | 'deal' | 'pause' | 'rc' | 'tc' | 'feedback'>('setup');
  const [events, setEvents] = useState<RoundEvent[]>([]);
  const [step, setStep] = useState(0);
  const [table, setTable] = useState<TableView>({ seats: [], dealer: [] });
  const rcRef = useRef(0); // true running count of all face-up cards from this shoe
  const [roundNo, setRoundNo] = useState(0);
  const [entry, setEntry] = useState('');
  const [rcAns, setRcAns] = useState<number | null>(null);
  const [fb, setFb] = useState<{ rc: number; rcAns: number; tcAns: number | null; decks: number; cardsLeft: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const newRound = () => {
    if (shoe.needsShuffle) { shoe.shuffle(); rcRef.current = 0; setNotice('Shuffle! New shoe — count resets to 0.'); }
    else setNotice(null);
    const ev = scriptRound(shoe, cs.players, rules, chart);
    setEvents(ev); setStep(0);
    setTable({ seats: Array.from({ length: cs.players }, () => []), dealer: [] });
    setPhase('deal');
  };

  useEffect(() => {
    if (phase !== 'deal') return;
    if (step >= events.length) {
      const n = roundNo + 1;
      setRoundNo(n);
      mutate((s) => {
        s.count.rounds.rounds++;
      });
      if (n % cs.quizEvery === 0) { setEntry(''); setTimeout(() => setPhase('rc'), 500); }
      else setPhase('pause');
      return;
    }
    const t = setTimeout(() => {
      const e = events[step];
      setTable((tv) => {
        const nt: TableView = { seats: tv.seats.map((s) => [...s]), dealer: [...tv.dealer] };
        if (e.kind === 'reveal') nt.dealer = nt.dealer.map((d) => ({ card: d.card }));
        else if (e.seat === -1) nt.dealer.push({ card: e.card, hidden: e.hidden });
        else nt.seats[e.seat].push(e.card);
        return nt;
      });
      if (e.kind === 'card' && !e.hidden) rcRef.current += hiLo(e.card);
      if (e.kind === 'reveal') { const hole = events.find((x) => x.kind === 'card' && x.hidden); if (hole && hole.kind === 'card') rcRef.current += hiLo(hole.card); }
      setStep(step + 1);
    }, step === 0 ? 300 : cs.speed * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, events]);

  useEffect(() => {
    if (phase !== 'pause') return;
    const t = setTimeout(newRound, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const decks = decksRemaining(shoe.remaining);
  const submitRc = (n: number) => {
    setRcAns(n);
    if (cs.quizTc) { setEntry(''); setPhase('tc'); }
    else finish(n, null);
  };
  const finish = (rcA: number, tcA: number | null) => {
    const rc = rcRef.current;
    const ok = rcA === rc;
    const tcOk = tcA === null ? null : gradeTrueCount(tcA, rc, decks, cs.tcConvention, cs.tcTolerance);
    mutate((s) => {
      recordErr(s.count.rounds.rc, rcA, rc, ok);
      if (tcA !== null) recordErr(s.count.rounds.tc, tcA, exactTrueCount(rc, decks), !!tcOk);
      if (ok && (tcOk ?? true) && (s.count.rounds.bestSpeed === null || cs.speed < s.count.rounds.bestSpeed)) s.count.rounds.bestSpeed = cs.speed;
    });
    setFb({ rc, rcAns: rcA, tcAns: tcA, decks, cardsLeft: shoe.remaining });
    setPhase('feedback');
  };

  if (phase === 'setup')
    return (
      <div className="count-body">
        <p className="hint">Full rounds dealt from a {rules.decks}-deck shoe. Count every card as it lands, including the dealer’s hole card when it flips. You’ll be quizzed on the running count and the true count.</p>
        <SpeedSlider value={cs.speed} onChange={(v) => set({ speed: v })} />
        <Seg label="Player hands at the table" value={cs.players} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]} onChange={(v) => set({ players: v })} />
        <Seg label="Quiz every" value={cs.quizEvery} options={[[1, '1 round'], [2, '2'], [3, '3'], [5, '5']]} onChange={(v) => set({ quizEvery: v })} />
        <Seg label="Also quiz true count" value={cs.quizTc} options={[[true, 'Yes'], [false, 'RC only']]} onChange={(v) => set({ quizTc: v })} />
        <TcOptions {...props} />
        <div className="flex1" />
        <div className="actions"><button className="btn deal" onClick={() => { setRoundNo(0); newRound(); }}>Deal rounds</button></div>
      </div>
    );

  if (phase === 'rc' || phase === 'tc')
    return (
      <div className="count-entry">
        <div className="mini-table"><MiniTable table={table} /></div>
        <div className="flex1" />
        {phase === 'rc' ? (
          <Keypad key="rc" value={entry} onChange={setEntry} onSubmit={submitRc} prompt="Running count?" sub={`After round ${roundNo} · ${shoe.remaining} cards left in shoe`} />
        ) : (
          <Keypad key="tc" value={entry} onChange={setEntry} onSubmit={(n) => finish(rcAns!, n)} allowDecimal={cs.tcTolerance}
            prompt="True count?"
            sub={`${cs.showDecksLeft ? `Decks remaining ≈ ${decks} · ` : ''}${cs.tcConvention === 'truncate' ? 'truncate toward 0' : cs.tcConvention === 'round' ? 'round to nearest' : 'floor'}${cs.tcTolerance ? ' · ±0.5 ok' : ''}`} />
        )}
      </div>
    );

  return (
    <div className="count-body">
      <div className="scoreline"><span>Round {phase === 'deal' ? roundNo + 1 : roundNo}</span><span>{shoe.remaining} cards left</span><span>{cs.speed.toFixed(1)} s/card</span></div>
      {notice && <div className="target-tag">{notice}</div>}
      <div className="table rounds-table"><MiniTable table={table} big /></div>
      {phase === 'feedback' && fb && (
        <div className="feedback-slot">
          <CountFeedback fb={fb} conv={cs.tcConvention} tol={cs.tcTolerance} />
        </div>
      )}
      <div className="actions">
        {phase === 'feedback' ? (
          <div className="pad-row big">
            <button className="btn act a-surrender" onClick={() => setPhase('setup')}>Settings</button>
            <button className="btn deal" onClick={newRound}>Next round</button>
          </div>
        ) : (
          <button className="btn deal ghosty" onClick={() => setPhase('setup')}>Stop</button>
        )}
      </div>
      <div className="muted small center-text">RC accuracy {store.count.rounds.rc.n ? Math.round((100 * store.count.rounds.rc.correct) / store.count.rounds.rc.n) : '–'}%</div>
    </div>
  );
}

export function CountFeedback({ fb, conv, tol }: { fb: { rc: number; rcAns: number; tcAns: number | null; decks: number; cardsLeft: number }; conv: TcConvention; tol: boolean }) {
  const exact = exactTrueCount(fb.rc, fb.decks);
  const tc = trueCount(fb.rc, fb.decks, conv);
  const rcOk = fb.rcAns === fb.rc;
  const tcOk = fb.tcAns === null ? true : gradeTrueCount(fb.tcAns, fb.rc, fb.decks, conv, tol);
  return (
    <div className={`feedback ${rcOk && tcOk ? 'good' : 'bad'}`}>
      <div className="fb-title">{rcOk ? '✓' : '✗'} Running count {fmtSigned(fb.rc)} <span className="muted">(you {fmtSigned(fb.rcAns)})</span></div>
      {fb.tcAns !== null && (
        <div className="fb-title">{tcOk ? '✓' : '✗'} True count {fmtSigned(tc)} <span className="muted">(you {fmtSigned(fb.tcAns)})</span></div>
      )}
      <div className="fb-sub">TC = {fmtSigned(fb.rc)} ÷ {fb.decks} decks left ({fb.cardsLeft} cards, rounded to ½ deck) = {fmtSigned(exact, 2)} → {fmtSigned(tc)} ({conv === 'truncate' ? 'truncated toward zero' : conv === 'round' ? 'rounded' : 'floored'}){tol ? '; ±0.5 accepted' : ''}</div>
    </div>
  );
}

function MiniTable({ table, big }: { table: TableView; big?: boolean }) {
  return (
    <div className="mt">
      <div className="mt-dealer">
        <div className="zone-label">Dealer</div>
        <div className="card-row tight">{table.dealer.map((d, k) => <CardView key={k} card={d.card} hidden={d.hidden} small />)}</div>
      </div>
      <div className={`mt-seats${big ? ' big' : ''}`}>
        {table.seats.map((s, k) => (
          <div key={k} className="mt-seat">
            <div className="stack">{s.map((c, j) => <div key={j} className="stack-card" style={{ top: j * 22 }}><CardView card={c} small /></div>)}</div>
            <div className="seat-label">P{k + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TcOptions(props: ModeProps) {
  const [cs, set] = useCountSettings(props);
  return (
    <>
      <Seg<TcConvention> help="tcConvention" label="True count convention" value={cs.tcConvention} options={[['truncate', 'Truncate'], ['round', 'Round'], ['floor', 'Floor']]} onChange={(v) => set({ tcConvention: v })} />
      <p className="muted small">{TC_CONVENTION_LABEL[cs.tcConvention]}. Decks remaining are estimated to the nearest ½ deck.</p>
      <Seg help="tcTolerance" label="Tolerance" value={cs.tcTolerance} options={[[false, 'Exact'], [true, '±0.5 of exact TC']]} onChange={(v) => set({ tcTolerance: v })} />
      <Seg help="showDecksLeft" label="Show decks-remaining estimate" value={cs.showDecksLeft} options={[[true, 'Show'], [false, 'Hide']]} onChange={(v) => set({ showDecksLeft: v })} />
    </>
  );
}

/* ---------------- Count while you play (settings) ---------------- */
function InPlay(props: ModeProps) {
  const [cs, set] = useCountSettings(props);
  const ramp = RAMPS[cs.spread];
  return (
    <div className="count-body scroll-y">
      <p className="hint">Turns the Play tab into a counting session: the count carries across hands until the shoe is shuffled. With Bet sizing on, you pick a bet in units before each hand, graded against the ramp below; with it off, every hand is a flat 1 unit. Every few hands you’ll be asked for the count. Basic-strategy coaching still runs; with Deviations on, decisions are graded against the Illustrious 18 / Fab 4 index play at the live true count, and you’re offered insurance when the dealer shows an ace. Weak-spot deals are paused while counting so the shoe stays natural.</p>
      <Seg help="countInPlay" label="Count while you play" value={cs.countInPlay} options={[[true, 'On'], [false, 'Off']]} onChange={(v) => set({ countInPlay: v })} />
      <Seg help="betSizing" label="Bet sizing" value={cs.betSizing} options={[[true, 'On — pick & grade bets'], [false, 'Off — flat 1 unit']]} onChange={(v) => set({ betSizing: v })} />
      <Seg help="deviations" label="Deviations (Hi-Lo index plays)" value={cs.deviations} options={[[true, 'On — grade index plays'], [false, 'Off — basic only']]} onChange={(v) => set({ deviations: v })} />
      <button className="linkbtn" onClick={() => props.openGuide(0)}>How deviations work ›</button>
      {cs.betSizing ? <>
      <Seg help="spread" label="Bet spread" value={cs.spread} options={[['1-8', '1–8 units'], ['1-12', '1–12 units']]} onChange={(v) => set({ spread: v })} />
      <div className="ramp">
        {ramp.map((r, k) => (
          <div key={k} className="ramp-step"><div className="muted small">TC {k === 0 ? `≤ ${r.tc}` : k === ramp.length - 1 ? `${r.tc}+` : r.tc}</div><div className="ramp-u">{r.units}u</div></div>
        ))}
      </div>
      </> : <p className="muted small">Bet sizing off: every hand is a flat 1 unit and bets aren’t graded. Turn it on to set a spread.</p>}
      <Seg help="playQuizEvery" label="Count quiz every" value={cs.playQuizEvery} options={[[1, '1 hand'], [3, '3'], [5, '5'], [10, '10']]} onChange={(v) => set({ playQuizEvery: v })} />
      <TcOptions {...props} />
      <p className="muted small">Units only — this is a practice tool, not real-money play.</p>
    </div>
  );
}
