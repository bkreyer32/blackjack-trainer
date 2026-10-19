import { describe, it, expect } from 'vitest';
import { generateChart } from '../src/engine/strategy';
import type { Code, DeckCount, Rules } from '../src/engine/types';
import { ALL_REFS, type RefChart } from './woo-reference';

const COLS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'];

/** Resolve a WoO legend code under concrete DAS/surrender rules (independent of engine code). */
function resolveRef(code: string, das: boolean, surr: boolean, hardFallback: string): Code {
  switch (code) {
    case 'Ph': return das ? 'P' : 'H';
    case 'Pd': return das ? 'P' : (hardFallback as Code);
    case 'Ps': return das ? 'P' : 'S';
    case 'Rh': return surr ? 'Rh' : 'H';
    case 'Rs': return surr ? 'Rs' : 'S';
    case 'Rp': return surr ? 'Rp' : 'P';
    case 'Rp*': return surr && !das ? 'Rp' : 'P';
    default: return code as Code;
  }
}

const row = (s: string) => s.trim().split(/\s+/);

function compare(ref: RefChart, decks: DeckCount, das: boolean, surrender: 'none' | 'late') {
  const rules: Rules = { decks, h17: ref.h17, das, surrender, blackjackPays: '3:2', maxHands: 4 };
  const chart = generateChart(rules);
  const surr = surrender === 'late';
  const diffs: string[] = [];
  let cells = 0;
  const check = (label: string, refRow: string, got: Code[], fallbackRow?: string) => {
    const want = row(refRow);
    expect(want).toHaveLength(10);
    want.forEach((w, i) => {
      cells++;
      const fb = fallbackRow ? row(fallbackRow)[i] : 'H';
      const exp = resolveRef(w, das, surr, fb);
      if (got[i] !== exp) diffs.push(`${label} v ${COLS[i]}: want ${exp} (${w}) got ${got[i]}`);
    });
  };
  for (const [t, r] of Object.entries(ref.hard)) check(`hard ${t}`, r, chart.hard[+t]);
  for (const [t, r] of Object.entries(ref.soft)) check(`soft ${t}`, r, chart.soft[+t]);
  for (const [p, r] of Object.entries(ref.pairs)) check(`pair ${p}`, r, chart.pairs[+p], ref.hard[+p * 2]);
  // Pairs the WoO chart omits: 5,5 plays as hard 10, 10,10 always stands.
  check('pair 5', ref.hard[10], chart.pairs[5]);
  check('pair 10', ref.hard[20], chart.pairs[10]);
  return { diffs, cells };
}

describe('strategy engine matches Wizard of Odds reference charts cell-by-cell', () => {
  for (const ref of ALL_REFS) {
    for (const decks of ref.decks as DeckCount[]) {
      for (const das of [true, false]) {
        for (const surrender of ['late', 'none'] as const) {
          it(`${ref.name} | ${decks}D ${das ? 'DAS' : 'noDAS'} ${surrender === 'late' ? 'LS' : 'NS'}`, () => {
            const { diffs, cells } = compare(ref, decks, das, surrender);
            expect(cells).toBeGreaterThan(300);
            expect(diffs).toEqual([]);
          });
        }
      }
    }
  }
});

describe('spot checks of well-known plays', () => {
  const base: Rules = { decks: 6, h17: true, das: true, surrender: 'late', blackjackPays: '3:2', maxHands: 4 };
  const c = generateChart(base);
  it('6D H17 DAS LS', () => {
    expect(c.hard[16][8]).toBe('Rh'); // 16 v 10
    expect(c.hard[11][9]).toBe('Dh'); // 11 v A (H17)
    expect(c.pairs[8][9]).toBe('Rp'); // 8,8 v A (H17 + LS)
    expect(c.soft[18][0]).toBe('Ds'); // A7 v 2 (H17)
    expect(c.soft[19][4]).toBe('Ds'); // A8 v 6 (H17)
    expect(c.hard[17][9]).toBe('Rs'); // 17 v A (H17)
    expect(c.pairs[4][3]).toBe('P'); // 4,4 v 5 with DAS
  });
  it('6D S17 no DAS no surrender', () => {
    const s = generateChart({ ...base, h17: false, das: false, surrender: 'none' });
    expect(s.hard[11][9]).toBe('H');
    expect(s.hard[16][8]).toBe('H');
    expect(s.pairs[2][0]).toBe('H');
    expect(s.pairs[6][0]).toBe('H');
    expect(s.pairs[4][3]).toBe('H');
    expect(s.soft[18][0]).toBe('S');
  });
});
