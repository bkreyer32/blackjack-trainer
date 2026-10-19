import { describe, it, expect } from 'vitest';
import { preHandStep, afterQuizStep, FLAT_BET } from '../src/count/flow';
import { DEFAULT_COUNT_SETTINGS, loadStore, saveStore } from '../src/stats/stats';

describe('Bet sizing toggle', () => {
  it('defaults on', () => expect(DEFAULT_COUNT_SETTINGS.betSizing).toBe(true));
  it('on: bet picker before every hand, after a quiz too', () => {
    expect(preHandStep(0, 5, true)).toBe('bet');
    expect(preHandStep(3, 5, true)).toBe('bet');
    expect(preHandStep(5, 5, true)).toBe('rc');
    expect(afterQuizStep(true)).toBe('bet');
  });
  it('off: no bet picker, flat 1 unit, count quizzes still happen', () => {
    expect(preHandStep(0, 5, false)).toBe('deal');
    expect(preHandStep(3, 5, false)).toBe('deal');
    expect(preHandStep(5, 5, false)).toBe('rc');
    expect(preHandStep(10, 5, false)).toBe('rc');
    expect(afterQuizStep(false)).toBe('review');
    expect(FLAT_BET).toBe(1);
  });

  it('persists, and old saves without the field default to on', () => {
    const mem = new Map<string, string>();
    (globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) };
    const s = loadStore();
    expect(s.settings.count.betSizing).toBe(true);
    s.settings.count.betSizing = false;
    saveStore(s);
    expect(loadStore().settings.count.betSizing).toBe(false);
    const old = JSON.parse([...mem.values()][0]);
    delete old.settings.count.betSizing;
    mem.set([...mem.keys()][0], JSON.stringify(old));
    expect(loadStore().settings.count.betSizing).toBe(true);
    delete (globalThis as any).localStorage;
  });
});
