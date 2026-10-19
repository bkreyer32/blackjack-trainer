import { describe, it, expect } from 'vitest';
import type { Card, Rank, Rules } from '../src/engine/types';
import { DEFAULT_RULES } from '../src/engine/types';
import { indexTable, correctPlay, insuranceCorrect, applicability, changedAt, playName, type IndexPlay } from '../src/engine/deviations';
import { generateChart } from '../src/engine/strategy';
import { codeAt } from '../src/engine/decide';
import { I18_REF, FAB4_REF } from './deviation-reference';

const c = (r: Rank): Card => ({ rank: r, suit: '♠' });
const R = (p: Partial<Rules> = {}): Rules => ({ ...DEFAULT_RULES, ...p });
const H17 = R({ h17: true });
const S17 = R({ h17: false });
const all = { canDouble: true, canSplit: true, canSurrender: true };
const noR = { ...all, canSurrender: false };

/** two non-pair, ace-free cards totalling t */
function hardCards(t: number): Card[] {
  for (let a = 10; a >= 2; a--) { const b = t - a; if (b >= 2 && b <= 10 && b !== a) return [c(String(a === 10 ? 'T' : a) as Rank), c(String(b === 10 ? 'T' : b) as Rank)]; }
  throw new Error('no cards');
}
const cardsFor = (p: IndexPlay) => (p.kind === 'pair' ? [c('T'), c('K')] : hardCards(p.row));
const ACT: Record<string, string> = { S: 'stand', H: 'hit', D: 'double', P: 'split', R: 'surrender' };

describe('index tables match the references', () => {
  for (const h17 of [false, true]) {
    it(`${h17 ? 'H17' : 'S17'} Illustrious 18 + Fab 4`, () => {
      const t = indexTable(h17);
      const i18 = t.filter((p) => p.group !== 'Fab4').sort((a, b) => a.rank - b.rank);
      expect(i18.map((p) => [playName(p).split(' vs ')[0], playName(p).split(' vs ')[1] ?? 'A', p.index, p.above]))
        .toEqual(I18_REF.map(([h, u, s, hh, a]) => [h, u, h17 ? hh : s, a]));
      const fab = t.filter((p) => p.group === 'Fab4').sort((a, b) => a.rank - b.rank);
      expect(fab.map((p) => [String(p.row), playName(p).split(' vs ')[1], p.index, p.above])).toEqual(FAB4_REF.map(([h, u, s, hh]) => [h, u, h17 ? hh : s, 'R']));
    });
  }
});

describe('each index flips exactly at its threshold (book convention: TC >= index)', () => {
  for (const rules of [H17, S17]) {
    for (const p of indexTable(rules.h17)) {
      it(`${rules.h17 ? 'H17' : 'S17'} ${playName(p)} @ ${p.index}`, () => {
        if (p.kind === 'insurance') {
          expect(insuranceCorrect(p.index)).toBe(true);
          expect(insuranceCorrect(p.index - 0.01)).toBe(false);
          return;
        }
        const av = p.group === 'Fab4' ? all : noR;
        const at = correctPlay(cardsFor(p), p.up, rules, av, p.index);
        const atFrac = correctPlay(cardsFor(p), p.up, rules, av, p.index + 0.9);
        const below = correctPlay(cardsFor(p), p.up, rules, av, p.index - 0.01);
        const wellBelow = correctPlay(cardsFor(p), p.up, rules, av, p.index - 1);
        expect(at.action).toBe(ACT[p.above]);
        expect(atFrac.action).toBe(ACT[p.above]);
        expect(below.action).not.toBe(ACT[p.above]);
        expect(wellBelow.action).toBe(below.action);
        expect(at.index?.id).toBe(p.id);
        // exactly one side is the basic play (tables are consistent with the 6D engine chart)
        expect([at.isDeviation, below.isDeviation].filter(Boolean)).toHaveLength(1);
        const dev = at.isDeviation ? at : below;
        expect(dev.reason).toContain(playName(p));
        expect(dev.reason).toContain('Hi-Lo index');
      });
    }
  }
});

describe('fallbacks and interactions', () => {
  it('no true count -> plain basic strategy', () => {
    const r = correctPlay([c('T'), c('6')], 10, H17, noR);
    expect(r).toMatchObject({ action: 'hit', isDeviation: false });
  });
  it('16 v 10 with late surrender keeps surrendering at any count; stand index applies to 3-card 16', () => {
    expect(correctPlay([c('T'), c('6')], 10, H17, all, 3).action).toBe('surrender');
    expect(correctPlay([c('T'), c('6')], 10, H17, all, -3).action).toBe('surrender');
    expect(correctPlay([c('T'), c('4'), c('2')], 10, H17, noR, 0).action).toBe('stand');
    expect(correctPlay([c('T'), c('4'), c('2')], 10, H17, noR, -0.5).action).toBe('hit');
  });
  it('16 v 10 without surrender: stand at TC 0', () => {
    const r = R({ surrender: 'none' });
    const res = correctPlay([c('T'), c('6')], 10, r, noR, 0);
    expect(res).toMatchObject({ action: 'stand', basic: 'hit', isDeviation: true });
    expect(res.reason).toBe('16 vs 10: stand at TC ≥ 0 (Hi-Lo index 0)');
  });
  it('Fab 4 15 v 10: surrender at 0+, hit below 0 (deviation from basic surrender), stand at +4 without surrender', () => {
    expect(correctPlay(hardCards(15), 10, S17, all, 0).action).toBe('surrender');
    const below = correctPlay(hardCards(15), 10, S17, all, -1);
    expect(below).toMatchObject({ action: 'hit', basic: 'surrender', isDeviation: true });
    expect(below.index?.id).toBe('15v10R');
    expect(correctPlay(hardCards(15), 10, R({ surrender: 'none' }), noR, 4).action).toBe('stand');
  });
  it('Fab 4 is off when surrender is not offered', () => {
    const r = R({ surrender: 'none' });
    expect(applicability(indexTable(true).find((p) => p.id === '14v10R')!, r).ok).toBe(false);
    expect(correctPlay(hardCards(14), 10, r, noR, 6).action).toBe('hit');
  });
  it('H17 15 v A: surrender at TC >= -1 (basic), hit below', () => {
    expect(correctPlay(hardCards(15), 11, H17, all, -1).action).toBe('surrender');
    expect(correctPlay(hardCards(15), 11, H17, all, -1.5)).toMatchObject({ action: 'hit', isDeviation: true });
  });
  it('doubles fall back to hit when doubling is not allowed', () => {
    expect(correctPlay([c('4'), c('3'), c('3')], 10, H17, { ...noR, canDouble: false }, 6).action).toBe('hit');
    expect(correctPlay([c('6'), c('4')], 10, H17, { ...noR, canDouble: false }, 6).action).toBe('hit');
    expect(correctPlay([c('6'), c('4')], 10, H17, noR, 4).action).toBe('double');
    // H17 11 v A: basic double; hit below -1
    expect(correctPlay([c('6'), c('5')], 11, H17, noR, -1).action).toBe('double');
    expect(correctPlay([c('6'), c('5')], 11, H17, noR, -1.01)).toMatchObject({ action: 'hit', isDeviation: true });
  });
  it('10,10 split index needs splitting available; otherwise stand', () => {
    expect(correctPlay([c('T'), c('Q')], 6, H17, noR, 4).action).toBe('split');
    expect(correctPlay([c('T'), c('Q')], 6, H17, { ...noR, canSplit: false }, 6).action).toBe('stand');
    expect(correctPlay([c('T'), c('Q')], 6, R({ das: false }), noR, 4).action).toBe('split');
    expect(correctPlay([c('T'), c('Q')], 6, H17, noR, 3.99).action).toBe('stand');
  });
  it('negative indices: 13 v 2 stands at -1, hits below; 12 v 6 H17 hits below -3', () => {
    expect(correctPlay(hardCards(13), 2, H17, noR, -1).action).toBe('stand');
    expect(correctPlay(hardCards(13), 2, H17, noR, -1.5).action).toBe('hit');
    expect(correctPlay(hardCards(12), 6, H17, noR, -3).action).toBe('stand');
    expect(correctPlay(hardCards(12), 6, H17, noR, -3.5).action).toBe('hit');
    expect(correctPlay(hardCards(12), 6, S17, noR, -1.5).action).toBe('hit');
  });
  it('insurance boundary', () => {
    expect(insuranceCorrect(2.99)).toBe(false);
    expect(insuranceCorrect(3)).toBe(true);
    expect(insuranceCorrect(undefined)).toBe(false);
  });
  it('soft hands and non-index cells are unaffected by the count', () => {
    expect(correctPlay([c('A'), c('7')], 9, H17, noR, 8).action).toBe('hit');
    expect(correctPlay(hardCards(17), 10, H17, noR, -8).action).toBe('stand');
  });
});

import { chartCodeAt } from '../src/engine/deviations';
describe('chart overlay codes', () => {
  it('shows the count-adjusted code', () => {
    expect(chartCodeAt(H17, 'hard', 16, 10, 0).code).toBe('Rs');
    expect(chartCodeAt(H17, 'hard', 16, 10, -1).code).toBe('Rh');
    expect(chartCodeAt(S17, 'hard', 15, 10, -1).code).toBe('H');
    expect(chartCodeAt(S17, 'hard', 14, 10, 3).code).toBe('Rh');
    expect(chartCodeAt(S17, 'hard', 10, 10, 4).code).toBe('Dh');
    expect(chartCodeAt(S17, 'pair', 10, 6, 4).code).toBe('P');
    expect(chartCodeAt(S17, 'hard', 12, 2, 3).code).toBe('S');
    expect(chartCodeAt(S17, 'soft', 18, 2, 9).code).toBe('S');
  });
});

describe('rule-set applicability', () => {
  it('every index is consistent with multi-deck basic strategy (one side is the basic play)', () => {
    for (const decks of [4, 6, 8] as const) for (const h17 of [true, false]) for (const das of [true, false]) {
      const rules = R({ decks, h17, das });
      const ch = generateChart(rules);
      for (const p of indexTable(h17)) {
        if (p.kind === 'insurance') continue;
        expect(applicability(p, rules).ok).toBe(true);
        const code = codeAt(ch, { kind: p.kind as 'hard' | 'pair', row: p.row, up: p.up });
        const map: Record<string, string> = { H: 'H', S: 'S', Dh: 'D', Ds: 'D', P: 'P', Rh: p.group === 'Fab4' ? 'R' : 'H', Rs: 'S', Rp: 'P' };
        expect([p.above, p.below]).toContain(map[code]);
      }
    }
  });
  it('1-2 decks: entries that contradict 1-2D basic are switched off', () => {
    const off = (rules: Rules) => indexTable(rules.h17).filter((p) => !applicability(p, rules).ok).map((p) => p.id).sort();
    expect(off(R({ decks: 2, h17: true }))).toEqual(['9v2']);
    expect(off(R({ decks: 2, h17: false }))).toEqual(['11vA', '9v2'].sort());
    expect(off(R({ decks: 1, h17: false }))).toContain('15v10R');
    expect(off(R({ decks: 1, h17: false }))).toContain('9v2');
    expect(correctPlay([c('5'), c('4')], 2, R({ decks: 1 }), noR, -3).action).toBe('double');
  });
  it('changedAt highlights the right cells', () => {
    const cells = (r: Rules, tc: number) => changedAt(r, tc).map((x) => `${x.kind === 'pair' ? 'TT' : x.row}v${x.up}`).sort();
    expect(cells(H17, 0)).toEqual(['16v10']); // Rh -> Rs (stand if surrender unavailable)
    expect(cells(R({ surrender: 'none' }), 0)).toEqual(['16v10']);
    expect(cells(S17, 4)).toEqual(['10v10', '10v11', '11v11', '12v2', '12v3', '14v10', '15v10', '15v11', '15v9', '16v10', '9v2', '9v7', 'TTv6'].sort());
    expect(cells(S17, -2)).toEqual(['12v4', '12v6', '13v2', '15v10'].sort());
  });
});

import { Shoe } from '../src/game/shoe';
import { deal, act, type Grader } from '../src/game/game';
describe('Play grading with a deviation grader', () => {
  it('16 v 10 (no surrender) at TC +1: stand is graded correct and flagged as a deviation', () => {
    const rules = R({ surrender: 'none' });
    const ch = generateChart(rules);
    const grader: Grader = (cards, up, av) => {
      const r = correctPlay(cards, up, rules, av, 1);
      return { action: r.action, basic: r.basic, isDeviation: r.isDeviation, reason: r.reason, indexId: r.index?.id, tc: 1 };
    };
    for (let i = 0; i < 30; i++) {
      const shoe = new Shoe(6);
      const s = deal(shoe, rules, { kind: 'hard', row: 16, up: 10 });
      if (s.phase !== 'player') continue; // dealer blackjack
      const after = act(s, 'stand', ch, rules, shoe, grader);
      const fb = after.feedback[0];
      expect(fb).toMatchObject({ correct: true, best: 'stand', basic: 'hit', isDeviation: true, indexId: '16v10' });
      const wrong = act(s, 'hit', ch, rules, shoe, grader).feedback[0];
      expect(wrong.correct).toBe(false);
      return;
    }
    throw new Error('never got a playable deal');
  });
});
