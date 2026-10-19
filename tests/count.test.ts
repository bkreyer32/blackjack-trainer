import { describe, it, expect } from 'vitest';
import type { Card, Rank } from '../src/engine/types';
import { hiLo, runningCount, decksRemaining, trueCount, exactTrueCount, gradeTrueCount, rampBet, applyConvention } from '../src/count/hilo';
import { Shoe } from '../src/game/shoe';

const c = (r: Rank): Card => ({ rank: r, suit: '♣' });

describe('Hi-Lo values', () => {
  it('tags every rank', () => {
    for (const r of ['2', '3', '4', '5', '6'] as Rank[]) expect(hiLo(c(r))).toBe(1);
    for (const r of ['7', '8', '9'] as Rank[]) expect(hiLo(c(r))).toBe(0);
    for (const r of ['T', 'J', 'Q', 'K', 'A'] as Rank[]) expect(hiLo(c(r))).toBe(-1);
  });
  it('a full shoe counts to zero (balanced count)', () => {
    for (const d of [1, 2, 6, 8]) {
      const s = new Shoe(d);
      expect(runningCount(s.cards)).toBe(0);
      expect(s.cards).toHaveLength(52 * d);
    }
  });
  it('running count of a sequence', () => {
    expect(runningCount(['2', 'K', '5', '6', '9', 'A', '3'].map((r) => c(r as Rank)))).toBe(2);
  });
});

describe('true count', () => {
  it('decks remaining estimate rounds to nearest half deck', () => {
    expect(decksRemaining(312)).toBe(6);
    expect(decksRemaining(250)).toBe(5); // 4.81
    expect(decksRemaining(230)).toBe(4.5); // 4.42
    expect(decksRemaining(10)).toBe(0.5);
  });
  it('conventions', () => {
    expect(trueCount(7, 2.5, 'truncate')).toBe(2); // 2.8
    expect(trueCount(-7, 2.5, 'truncate')).toBe(-2);
    expect(trueCount(-7, 2.5, 'floor')).toBe(-3);
    expect(trueCount(5, 2, 'round')).toBe(3); // 2.5 -> 3
    expect(trueCount(-5, 2, 'round')).toBe(-3);
    expect(trueCount(-1, 4, 'truncate')).toBe(0);
    expect(Object.is(applyConvention(-0.25, 'truncate'), -0)).toBe(false);
    expect(exactTrueCount(9, 4.5)).toBe(2);
  });
  it('grading with and without ±0.5 tolerance', () => {
    // RC 7, 2.5 decks -> 2.8
    expect(gradeTrueCount(2, 7, 2.5, 'truncate', false)).toBe(true);
    expect(gradeTrueCount(3, 7, 2.5, 'truncate', false)).toBe(false);
    expect(gradeTrueCount(3, 7, 2.5, 'truncate', true)).toBe(true); // |3-2.8| <= .5
    expect(gradeTrueCount(2.5, 7, 2.5, 'truncate', true)).toBe(true);
    expect(gradeTrueCount(4, 7, 2.5, 'truncate', true)).toBe(false);
  });
});

describe('bet ramp', () => {
  it('1-8 spread', () => {
    expect([-3, 0, 1, 2, 3, 4, 5, 9].map((t) => rampBet(t, '1-8'))).toEqual([1, 1, 1, 2, 4, 6, 8, 8]);
  });
  it('1-12 spread', () => {
    expect([-1, 1, 2, 3, 4, 5, 7].map((t) => rampBet(t, '1-12'))).toEqual([1, 1, 2, 4, 8, 12, 12]);
  });
});

import { scriptRound, roundCards } from '../src/count/rounds';
import { generateChart } from '../src/engine/strategy';
import { DEFAULT_RULES } from '../src/engine/types';
describe('dealt rounds', () => {
  it('running count across rounds equals count of all dealt cards, and the shoe nets to zero', () => {
    const shoe = new Shoe(6);
    const chart = generateChart(DEFAULT_RULES);
    let rc = 0;
    let dealt = 0;
    while (!shoe.needsShuffle) {
      const ev = scriptRound(shoe, 5, DEFAULT_RULES, chart);
      const cards = roundCards(ev);
      rc += runningCount(cards);
      dealt += cards.length;
      expect(ev.filter((e) => e.kind === 'reveal')).toHaveLength(1);
    }
    expect(dealt + shoe.remaining).toBe(312);
    expect(rc + runningCount(shoe.cards)).toBe(0);
  });
});
