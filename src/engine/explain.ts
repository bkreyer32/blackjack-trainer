import type { Code, HandKind, Rules, Up } from './types';
import { upLabel } from './types';
import { rawPair } from './strategy';

/** Approximate chance the dealer busts, by upcard (multi-deck, after peek). */
export function dealerBust(up: Up, r: Rules): number {
  const s17: Record<number, number> = { 2: 35, 3: 37, 4: 40, 5: 42, 6: 42, 7: 26, 8: 24, 9: 23, 10: 23, 11: 17 };
  const h17: Record<number, number> = { ...s17, 6: 44, 11: 19 };
  return (r.h17 ? h17 : s17)[up];
}

export const CODE_NAME: Record<Code, string> = {
  H: 'Hit',
  S: 'Stand',
  P: 'Split',
  Dh: 'Double (else hit)',
  Ds: 'Double (else stand)',
  Rh: 'Surrender (else hit)',
  Rs: 'Surrender (else stand)',
  Rp: 'Surrender (else split)',
};

export function rowLabel(kind: HandKind, row: number): string {
  if (kind === 'hard') return `Hard ${row}`;
  if (kind === 'soft') return row === 21 ? 'Soft 21' : `Soft ${row} (A,${row - 11})`;
  const c = row === 11 ? 'A' : String(row);
  return `${c},${c}`;
}

function weak(up: Up) {
  return up >= 2 && up <= 6;
}

/** Short plain-English reason for a chart cell. */
export function explain(kind: HandKind, row: number, up: Up, code: Code, r: Rules): string {
  const u = upLabel(up);
  const bust = dealerBust(up, r);
  const bustTxt = `the dealer busts about ${bust}% of the time with a ${u} up`;
  const fallback =
    code === 'Dh' ? ' If you can’t double (e.g. 3+ cards), hit.'
    : code === 'Ds' ? ' If you can’t double, stand — the total is good enough.'
    : code === 'Rh' ? ' If surrender isn’t offered (or you’ve already taken a card), hit.'
    : code === 'Rs' ? ' If surrender isn’t offered, stand.'
    : code === 'Rp' ? ' If surrender isn’t offered, split.'
    : '';

  if (code === 'Rh' || code === 'Rs' || code === 'Rp') {
    let why: string;
    if (kind === 'pair' && row === 8) why = `8,8 against an ace is so bad that, with the dealer hitting soft 17, giving up half the bet loses less than splitting into two 8s.`;
    else if (kind === 'pair') why = `${row},${row} vs ${u} is a losing hand however you play it (in a single deck, the 7s you’d need are already in your hand), so surrendering for half your bet is cheapest.`;
    else if (row === 17) why = `Hard 17 vs an ace when the dealer hits soft 17 loses more than half your bet on average — surrendering caps the loss at 50%.`;
    else why = `Hard ${row} vs ${u} is one of the worst spots in the game: you lose more than half your bet on average however you play it, so surrendering for exactly half is cheaper.`;
    return why + fallback;
  }

  if (kind === 'pair') {
    if (row === 11) return 'Never play two aces as 12. Split them: each hand starts as 11 and many become 20 or 21.';
    if (row === 10) return 'Two tens make 20, which wins most of the time. Never break up a 20.';
    if (row === 5) return `Treat 5,5 as hard 10, not a pair — two hands starting with 5 are weak. ${code === 'Dh' ? `Double: 10 is a strong start vs a ${u}.` : `Against a ${u}, just hit.`}` + fallback;
    if (row === 8 && code === 'P') return 'Hard 16 is the worst total in blackjack. Splitting gives you two hands starting at 8, which is far better than playing 16.';
    if (row === 9) {
      if (code === 'S' && up === 7) return 'The dealer’s 7 most often makes 17, and your 18 already beats that. Stand.';
      if (code === 'S') return `18 is your best shot against a ${u}; splitting into two 9s against this strong card only puts more money at risk.`;
      return `Two hands starting with 9 do better than one 18 against a ${u}, so split and get more money out.`;
    }
    if (code === 'P') {
      const raw = rawPair(row, up, r);
      const dasNote = r.das && (raw === 'Ph' || raw === 'Pd' || raw === 'Ps')
        ? ' This split is only right because you can double after splitting.' : '';
      return weak(up) || up === 7
        ? `Splitting ${row}s against a ${u} turns one weak hand into two hands vs a dealer card that ${weak(up) ? `busts a lot (~${bust}%)` : 'is beatable'}.${dasNote}`
        : `Splitting is right here.${dasNote}`;
    }
    if (code === 'H') return `Against a ${u}, splitting ${row}s just makes two weak hands. Play it as hard ${row * 2} and hit.`;
    if (code === 'Dh') return `Play 4,4 as hard 8: double against the weak ${u}.` + fallback;
    if (row === 7 && code === 'S') return `Single-deck quirk: with two 7s already out of a 52-card deck, hitting this 14 against a 10 is slightly worse than standing. Play it as hard 14 and stand.`;
    return `Play it as hard ${row * 2}. ` + explain('hard', row * 2, up, code, r);
  }

  if (kind === 'soft') {
    if (row >= 20) return 'Soft 20+ is a great hand. Stand.';
    if (code === 'Dh') return `You can’t bust a soft hand with one card, and ${bustTxt}. That makes soft ${row} a good chance to get more money out.` + fallback;
    if (code === 'Ds') return `Soft ${row} is already decent, and ${bustTxt} — double for value.` + fallback;
    if (code === 'H') {
      if (row === 18) return `Soft 18 is an underdog to a dealer ${u}. You can’t bust by taking one card, so hit to improve.`;
      return `Soft ${row} rarely wins by standing, and a soft hand can’t bust on one card. Hit.`;
    }
    if (code === 'S') {
      if (row === 18) return `Soft 18 is good enough here: against a ${u} the dealer often ends on 17 or 18. Stand.`;
      return `Soft ${row} is a strong total. Stand.`;
    }
  }

  // hard
  if (row >= 17) return code === 'S' ? 'Hard 17 or more busts too often if you hit. Stand.' : '';
  if (row <= 8 && code === 'H') return 'You can’t bust, and this total is too low to win standing. Always hit.';
  if (code === 'Dh') {
    if (row === 11) return `11 is the best doubling hand: any ten makes 21. You’re the favorite against a ${u}, so double.` + fallback;
    if (row === 10) return `A ten makes 20, and you’re ahead against a dealer ${u}. Double to put more money on a winning spot.` + fallback;
    return `Hard ${row} vs a weak ${u}: ${bustTxt}, so it’s worth doubling.` + fallback;
  }
  if (code === 'H') {
    if (row === 11) return `With an ace up and the dealer standing on soft 17 in a big shoe, doubling 11 is a small loser. Just hit.`;
    if (row === 10) return `A dealer ${u} is as strong as your 10, so don’t add money. Just hit.`;
    if (row === 9) return `9 isn’t strong enough to double against a ${u}. Just hit.`;
    if (row === 8) return 'Hard 8 can’t bust. Hit.';
    if (row === 12 && up <= 3) return `A ${u} isn’t weak enough to stand on 12. Only a ten busts you (4 of 13 cards), so hitting loses less than standing.`;
    return `A dealer ${u} usually makes 17 or more, so standing on ${row} loses too often. Take the risk and hit.`;
  }
  if (code === 'S') return `Hard ${row} is a stiff hand, but ${bustTxt}. Don’t risk busting; let the dealer take that risk.`;
  return '';
}
