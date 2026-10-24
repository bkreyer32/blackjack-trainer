import { describe, it, expect } from 'vitest';
import { emptyShoeStats, recordShoeDecision, addPair, summarizeShoe } from '../src/game/shoeSummary';
import type { CellRef } from '../src/engine/decide';

const c = (row: number, up: number): CellRef => ({ kind: 'hard', row, up } as CellRef);

describe('shoe summary', () => {
  it('tallies decisions, accuracy and the weakest cells', () => {
    const s = emptyShoeStats();
    recordShoeDecision(s, c(16, 10), false, false);
    recordShoeDecision(s, c(16, 10), false, false);
    recordShoeDecision(s, c(12, 4), false, false);
    recordShoeDecision(s, c(11, 6), true, false);
    s.hands = 3;
    const sum = summarizeShoe(s);
    expect(sum.hands).toBe(3);
    expect(sum.decisions).toBe(4);
    expect(sum.accuracy).toBe(25);
    expect(sum.weak[0]).toMatchObject({ label: 'Hard 16 vs 10', n: 2, missed: 2 });
    expect(sum.weak.map((w) => w.label)).not.toContain('Hard 11 vs 6'); // never missed
    expect(sum.weak.length).toBeLessThanOrEqual(3);
  });
  it('omits counting sections unless they were exercised', () => {
    const s = emptyShoeStats();
    expect(summarizeShoe(s)).toMatchObject({ accuracy: null, rc: null, tc: null, bet: null, dev: null });
    addPair(s.rc, true); addPair(s.rc, false); addPair(s.bet, true);
    recordShoeDecision(s, c(15, 10), true, true);
    const sum = summarizeShoe(s);
    expect(sum.rc).toEqual({ n: 2, correct: 1 });
    expect(sum.bet).toEqual({ n: 1, correct: 1 });
    expect(sum.dev).toEqual({ n: 1, correct: 1 });
  });
});
