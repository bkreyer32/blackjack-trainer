import { useRef, useState, type ReactNode } from 'react';
import type { Rules } from '../engine/types';
import { indexTable, fmtTc } from '../engine/deviations';

interface Page { title: string; body: ReactNode }

function pages(rules: Rules): Page[] {
  const t = indexTable(rules.h17);
  const idx = (id: string) => fmtTc(t.find((p) => p.id === id)!.index);
  return [
    {
      title: 'Why the count changes the right play',
      body: (
        <>
          <p>Basic strategy assumes an average, freshly shuffled shoe. The count tells you when the cards still to come are <b>not</b> average.</p>
          <div className="g-split">
            <div className="g-box plus"><b>Lots of tens &amp; aces left</b> (count is up)<ul><li>Dealer busts stiffs more often → <b>stand</b> more</li><li>Your doubles land on 20/21 more → <b>double</b> more</li><li>Dealer blackjack is likelier → <b>insurance</b> can pay</li></ul></div>
            <div className="g-box minus"><b>Lots of small cards left</b> (count is down)<ul><li>Hitting a stiff is safer → <b>hit</b> more</li><li>Dealer makes hands more → <b>double</b> less</li></ul></div>
          </div>
          <p className="muted">These count-based exceptions are called <b>deviations</b> or <b>index plays</b>.</p>
        </>
      ),
    },
    {
      title: 'Running count vs true count',
      body: (
        <>
          <p><b>Running count (RC):</b> +1 for every 2–6, −1 for every 10–A, 0 for 7–9.</p>
          <p>An RC of +6 means a lot with one deck left, and very little with six decks left: the same six extra big cards are spread over many more cards.</p>
          <p><b>True count (TC) = RC ÷ decks remaining.</b> It measures the extra big cards <i>per deck</i>, which is what changes your odds.</p>
          <div className="g-ex">RC +6, 3 decks left → TC <b>+2</b><br />RC +6, 1.5 decks left → TC <b>+4</b></div>
          <p className="muted">In this app decks remaining = cards left ÷ 52, to the nearest ½ deck. It's shown on screen whenever you're asked.</p>
        </>
      ),
    },
    {
      title: 'What an index number means',
      body: (
        <>
          <p>Every deviation has an <b>index</b>: a true count.</p>
          <div className="g-ex big">TC <b>≥ index</b> → make the index play<br />(stand · double · split · surrender · insure)<br />TC <b>&lt; index</b> → play it the other way</div>
          <p>Negative indices follow the same rule. <b>13 vs 2</b> has index −1: stand at −1 or higher, hit below −1 (−1.5, −2, …).</p>
          <p className="muted">This is the convention in Schlesinger's <i>Blackjack Attack</i>. The app compares the exact TC, which is the same as rounding it <b>down</b>: TC −0.4 counts as below 0, not as 0.</p>
        </>
      ),
    },
    {
      title: 'Example: 16 vs 10 (index 0)',
      body: (
        <>
          <p><b>Basic:</b> hit (or surrender, if allowed).</p>
          <p><b>Index play:</b> stand as soon as TC ≥ 0.</p>
          <p>16 vs 10 is nearly a coin flip at a neutral count. Any surplus of tens means hitting busts you more often than standing loses.</p>
          <div className="g-ex">RC +1, 4 decks left → TC +0.25 → <b>stand</b><br />RC −2, 4 decks left → TC −0.5 → <b>hit</b></div>
          <p className="muted">With late surrender you still surrender a two-card 16 vs 10. The stand index matters when you can't surrender, such as after taking a card.</p>
        </>
      ),
    },
    {
      title: 'Example: insurance at +3',
      body: (
        <>
          <p>Insurance is a side bet that pays 2:1 if the dealer's hole card is a ten.</p>
          <p>In a neutral shoe fewer than 1 card in 3 is a ten, so the bet loses. Basic strategy says <b>never</b>.</p>
          <p>At <b>TC +3 or higher</b> enough tens are left that it wins money. Take insurance (or even money with a blackjack).</p>
          <div className="g-ex">Dealer shows A · RC +8, 2.5 decks left → TC +3.2 → <b>insure</b><br />RC +7, 2.5 decks left → TC +2.8 → <b>no</b></div>
          <p className="muted">Insurance is the single most valuable index play.</p>
        </>
      ),
    },
    {
      title: 'Example: 12 vs 3 (index +2)',
      body: (
        <>
          <p><b>Basic:</b> hit 12 vs 3. Only a ten busts you.</p>
          <p><b>Index play:</b> at TC +2 or higher there are enough tens left that hitting busts too often, and the dealer's 3 busts more. <b>Stand.</b></p>
          <div className="g-ex">RC +5, 2.5 decks left → TC +2.0 → <b>stand</b><br />RC +4, 2.5 decks left → TC +1.6 → <b>hit</b> (basic)</div>
          <p className="muted">Close relatives: 12 vs 2 stands at {idx('12v2')}, 12 vs 4 hits below {idx('12v4')}.</p>
        </>
      ),
    },
    {
      title: 'How to learn them',
      body: (
        <>
          <p>Learn them in order of value. The first few are worth most of the money:</p>
          <ol className="g-list">
            <li><b>Insurance</b> at +3</li>
            <li><b>16 vs 10</b>: stand at 0</li>
            <li><b>15 vs 10</b>: stand at +4</li>
            <li><b>Fab 4 surrenders</b> (late surrender only): 14 vs 10 at {idx('14v10R')}, 15 vs 10 at {idx('15v10R')}, 15 vs 9 at {idx('15v9R')}, 15 vs A at {idx('15vAR')}</li>
            <li>Then the rest of the Illustrious 18, top down</li>
          </ol>
          <p>Practice path: <b>Learn → Index</b> to read them, <b>Drill → Index</b> to quiz them (it repeats your misses), then <b>Play</b> with <i>Count while you play</i> on.</p>
        </>
      ),
    },
    {
      title: 'How the app grades deviations',
      body: (
        <>
          <ul className="g-list">
            <li>In Play with counting and deviations on, each decision is graded against the index play at the <b>current TC</b>. That's the count of every card seen so far, including this hand, ÷ decks left.</li>
            <li>If they differ you'll see: <i>"Basic says Hit, but at TC +1 the index play is Stand."</i></li>
            <li>When the dealer shows an ace you're offered insurance, graded by TC ≥ +3.</li>
            <li>Indices follow your rules: separate <b>{rules.h17 ? 'H17' : 'S17'}</b> numbers (switch in ⚙︎), and Fab 4 only with late surrender. 1–2 deck games use the multi-deck set; any entries that don't fit are marked off in the Index list.</li>
            <li>Turn deviations off in Count → In Play to grade basic strategy only.</li>
          </ul>
        </>
      ),
    },
  ];
}

export function Guide({ open, start = 0, onClose, rules }: { open: boolean; start?: number; onClose: () => void; rules: Rules }) {
  const ps = pages(rules);
  const [i, setI] = useState(start);
  const x0 = useRef<number | null>(null);
  if (!open) return null;
  const go = (d: number) => setI((v) => Math.min(ps.length - 1, Math.max(0, v + d)));
  return (
    <div className="guide" role="dialog"
      onTouchStart={(e) => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (x0.current === null) return; const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); x0.current = null; }}>
      <div className="guide-top">
        <span className="muted">How deviations work · {i + 1}/{ps.length}</span>
        <button className="guide-x" onClick={onClose} aria-label="Close guide">✕</button>
      </div>
      <div className="guide-page" key={i}>
        <h2>{ps[i].title}</h2>
        {ps[i].body}
      </div>
      <div className="guide-dots">{ps.map((_, k) => <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`page ${k + 1}`} />)}</div>
      <div className="pad-row big guide-nav">
        <button className="btn act a-surrender" disabled={i === 0} onClick={() => go(-1)}>‹ Back</button>
        {i < ps.length - 1 ? <button className="btn deal" onClick={() => go(1)}>Next ›</button> : <button className="btn deal" onClick={onClose}>Done</button>}
      </div>
    </div>
  );
}
