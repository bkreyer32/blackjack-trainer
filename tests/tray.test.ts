import { describe, it, expect } from 'vitest';
import { Shoe } from '../src/game/shoe';
import { trayState, discardsAfterRound, NEAR_CUT } from '../src/game/tray';

describe('discard tray maths', () => {
  it('stack height is discards / total for every deck count', () => {
    for (const d of [1, 2, 4, 6, 8]) {
      const total = d * 52;
      expect(trayState(0, total, 0).fill).toBe(0);
      expect(trayState(total / 2, total, 0).fill).toBeCloseTo(0.5);
      expect(trayState(total, total, 0).fill).toBe(1);
    }
    expect(trayState(78, 312, 78).fill).toBeCloseTo(0.25);
    expect(trayState(78, 312, 78).pct).toBe(25);
  });
  it('cut-card marker sits at the 75% penetration point', () => {
    for (const d of [1, 2, 4, 6, 8]) {
      const sh = new Shoe(d);
      const t = trayState(0, sh.total, sh.cutRemaining);
      expect(t.cut).toBeCloseTo(0.75, 1);
      expect(sh.total - sh.cutRemaining).toBe(Math.ceil(d * 52 * 0.75));
    }
    expect(new Shoe(6).total).toBe(312);
  });
  it('level changes as the stack nears and reaches the cut card', () => {
    const sh = new Shoe(6); const cutD = sh.total - sh.cutRemaining; // 234
    expect(trayState(0, 312, sh.cutRemaining).level).toBe('ok');
    expect(trayState(Math.floor(NEAR_CUT * cutD) - 1, 312, sh.cutRemaining).level).toBe('ok');
    expect(trayState(Math.ceil(NEAR_CUT * cutD), 312, sh.cutRemaining).level).toBe('near');
    expect(trayState(cutD, 312, sh.cutRemaining).level).toBe('cut');
  });
  it('discards update at round end: cards of the current hand are not in the tray until then', () => {
    const sh = new Shoe(6, () => 0.5);
    let tray = discardsAfterRound(sh.total, sh.remaining); // after previous round
    expect(tray).toBe(0);
    for (let i = 0; i < 5; i++) sh.draw();               // a hand is dealt and played: shoe shrinks…
    expect(tray).toBe(0);                                 // …but the tray hasn't changed mid-hand
    tray = discardsAfterRound(sh.total, sh.remaining);    // round ends
    expect(tray).toBe(5);
    sh.shuffle();                                         // reshuffle empties the tray
    expect(discardsAfterRound(sh.total, sh.remaining)).toBe(0);
  });
});
