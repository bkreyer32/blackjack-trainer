import { useRef, useState } from 'react';
import { DEFAULT_RULES, type Rules } from '../engine/types';
import type { Store } from '../stats/stats';
import { DISCLAIMER } from './about-text';

interface Props {
  store: Store;
  mutate: (fn: (s: Store) => void) => void;
  onFinish: (start?: string) => void;
  /** needs the disclaimer acknowledgement (first launch). When re-opened from Settings it can be skipped freely. */
  firstRun: boolean;
}

const PRESETS: { id: string; label: string; sub: string; rules: Partial<Rules> }[] = [
  { id: 'std', label: '6 decks · dealer hits soft 17', sub: 'The most common casino shoe game', rules: { decks: 6, h17: true, das: true, surrender: 'late', blackjackPays: '3:2' } },
  { id: 's17', label: '6 decks · dealer stands on soft 17', sub: 'Slightly friendlier rules', rules: { decks: 6, h17: false, das: true, surrender: 'late', blackjackPays: '3:2' } },
  { id: 'dd', label: '2 decks', sub: 'Pitch games', rules: { decks: 2, h17: false, das: true, surrender: 'none', blackjackPays: '3:2' } },
  { id: 'sd', label: 'Single deck', sub: 'Hand-held games', rules: { decks: 1, h17: false, das: false, surrender: 'none', blackjackPays: '3:2' } },
];

/** First-run welcome: what the app does → pick rules → disclaimer → where to start. Swipe or Next/Back. */
export function Welcome({ store, mutate, onFinish, firstRun }: Props) {
  const [i, setI] = useState(0);
  const [ack, setAck] = useState(!firstRun);
  const x0 = useRef<number | null>(null);
  const N = 4;
  const DISCLAIMER_PAGE = 2;
  const go = (d: number) => setI((v) => Math.min(N - 1, Math.max(0, v + d)));
  const canNext = i !== DISCLAIMER_PAGE || ack;
  const pickPreset = (p: (typeof PRESETS)[number]) => mutate((s) => { s.rules = { ...DEFAULT_RULES, ...p.rules } as Rules; });
  const selected = (p: (typeof PRESETS)[number]) => Object.entries(p.rules).every(([k, v]) => (store.rules as any)[k] === v);
  return (
    <div className="guide welcome" role="dialog" aria-modal="true" aria-label="Welcome"
      onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 60 && (dx > 0 || canNext)) go(dx < 0 ? 1 : -1); x0.current = null; }}>
      <div className="guide-top">
        <span className="muted">Welcome · {i + 1}/{N}</span>
        {i < DISCLAIMER_PAGE
          ? <button className="welcome-skip" onClick={() => setI(DISCLAIMER_PAGE)}>Skip</button>
          : !firstRun ? <button className="guide-x" onClick={() => onFinish()} aria-label="Close welcome">✕</button> : <span />}
      </div>
      <div className="guide-page" key={i}>
        {i === 0 && (<>
          <div className="welcome-hero" aria-hidden="true">🃏</div>
          <h2>Learn blackjack the right way</h2>
          <p>Practice <b>basic strategy</b> with a coach that tells you why. Drill the hands you miss, play simulated hands, and — when you’re ready — train <b>Hi-Lo card counting</b> and the index plays that go with it.</p>
          <p className="muted">Everything is practice with imaginary units. No real money, no accounts.</p>
        </>)}
        {i === 1 && (<>
          <h2>Pick your table rules</h2>
          <p>The right play depends on the rules. Choose what looks like your table; you can fine-tune later from the rules chip at the top.</p>
          <div className="welcome-presets">
            {PRESETS.map((p) => (
              <button key={p.id} className={`welcome-preset${selected(p) ? ' on' : ''}`} aria-pressed={selected(p)} onClick={() => pickPreset(p)}>
                <b>{p.label}</b><span className="muted small">{p.sub}</span>
              </button>
            ))}
          </div>
        </>)}
        {i === 2 && (<>
          <h2>Before you start</h2>
          <ul className="g-list">{DISCLAIMER.map((t) => <li key={t}>{t}</li>)}</ul>
          {firstRun && (
            <label className="welcome-ack">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>I understand</span>
            </label>
          )}
        </>)}
        {i === 3 && (<>
          <h2>Where do you want to start?</h2>
          <div className="welcome-presets">
            <button className="welcome-preset" onClick={() => onFinish('learn')}><b>📖 Learn the chart</b><span className="muted small">Tap any cell to see the play and why. Best if you’re new.</span></button>
            <button className="welcome-preset" onClick={() => onFinish('play')}><b>🃏 Play with a coach</b><span className="muted small">Deal hands and get instant feedback.</span></button>
            <button className="welcome-preset" onClick={() => onFinish('count')}><b>🔢 Try counting</b><span className="muted small">Flash cards and learn Hi-Lo.</span></button>
          </div>
          <button className="linkbtn" onClick={() => onFinish()}>Just let me in</button>
        </>)}
      </div>
      <div className="guide-dots" aria-hidden="true">{Array.from({ length: N }, (_, k) => <span key={k} className={`dot-i${k === i ? ' on' : ''}`} />)}</div>
      <div className="pad-row big guide-nav">
        <button className="btn act a-surrender" disabled={i === 0} onClick={() => go(-1)}>‹ Back</button>
        {i < N - 1 ? <button className="btn deal" disabled={!canNext} onClick={() => go(1)}>Next ›</button> : <button className="btn deal" onClick={() => onFinish()}>Done</button>}
      </div>
    </div>
  );
}
