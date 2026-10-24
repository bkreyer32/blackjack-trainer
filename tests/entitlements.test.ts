import { describe, it, expect } from 'vitest';
import { allowed, clampFlash, effectiveCountSettings, effectiveDrillFilter, FREE_FLASH_CARDS, type Feature } from '../src/entitlements/gating';
import { EntitlementController, reconcile, ENT_KEY } from '../src/entitlements/controller';
import { MockProvider } from '../src/entitlements/providers/mock';
import { DEFAULT_COUNT_SETTINGS } from '../src/stats/stats';
import type { SyncKV } from '../src/storage';

const kv = (): SyncKV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), keys: () => [...m.keys()] };
};
const ALL: Feature[] = ['flashUnlimited', 'rounds', 'countInPlay', 'betSizing', 'deviationGrading', 'deviationDrill', 'tcOverlay', 'countStats'];
const make = (opts: { gated?: boolean; store?: SyncKV } = {}) => {
  const store = opts.store ?? kv();
  const mock = new MockProvider(store, 0);
  return { store, mock, ctl: new EntitlementController(mock, store, 'pid', opts.gated ?? true) };
};

describe('gating rules', () => {
  it('every paid feature is locked for free users and open for Pro', () => {
    for (const f of ALL) { expect(allowed(f, false)).toBe(false); expect(allowed(f, true)).toBe(true); }
  });
  it('Flash is capped at 20 cards and no full decks when free', () => {
    expect(clampFlash(52, 0, false)).toEqual({ cards: FREE_FLASH_CARDS, decks: 0 });
    expect(clampFlash(10, 0, false)).toEqual({ cards: 10, decks: 0 });
    expect(clampFlash(20, 1, false)).toEqual({ cards: 20, decks: 0 });
    expect(clampFlash(52, 2, true)).toEqual({ cards: 52, decks: 2 });
  });
  it('free users never get counting, bets or deviations, whatever was saved', () => {
    const saved = { ...DEFAULT_COUNT_SETTINGS, countInPlay: true, deviations: true, betSizing: true };
    const e = effectiveCountSettings(saved, false);
    expect([e.countInPlay, e.deviations, e.betSizing]).toEqual([false, false, false]);
    expect(effectiveCountSettings(saved, true)).toEqual(saved);
    expect(e.speed).toBe(saved.speed); // unrelated settings untouched
  });
  it('index drill falls back to all-hands for free users; other filters are free', () => {
    expect(effectiveDrillFilter('index', false)).toBe('all');
    expect(effectiveDrillFilter('index', true)).toBe('index');
    for (const f of ['all', 'hard', 'soft', 'pair'] as const) expect(effectiveDrillFilter(f, false)).toBe(f);
  });
});

describe('entitlement controller', () => {
  it('web build (not gated) is fully unlocked and never opens a paywall', async () => {
    const { ctl } = make({ gated: false });
    await ctl.init();
    expect(ctl.hasPro()).toBe(true);
    ctl.openPaywall('x');
    expect(ctl.state.paywallOpen).toBe(false);
  });
  it('native starts free, buying unlocks and persists', async () => {
    const { ctl, store } = make();
    await ctl.init();
    expect(ctl.hasPro()).toBe(false);
    ctl.openPaywall('rounds');
    expect(ctl.state.paywallOpen).toBe(true);
    await ctl.buy();
    expect(ctl.hasPro()).toBe(true);
    expect(ctl.state.paywallOpen).toBe(false);
    expect(JSON.parse(store.getItem(ENT_KEY)!).pro).toBe(true);
    // next launch: cached entitlement is available immediately, before re-verify
    const again = new EntitlementController(new MockProvider(store, 0), store, 'pid', true);
    expect(again.hasPro()).toBe(true);
  });
  it('restore finds an earlier purchase, or says there is none', async () => {
    const { ctl, mock } = make();
    await ctl.init();
    await ctl.restore();
    expect(ctl.hasPro()).toBe(false);
    expect(ctl.state.message).toMatch(/No previous purchase/);
    mock.setOwned(true);
    await ctl.restore();
    expect(ctl.hasPro()).toBe(true);
  });
  it('offer-code redemption arrives as a transaction update and unlocks', async () => {
    const { ctl } = make();
    await ctl.init();
    await ctl.redeem();
    await new Promise((r) => setTimeout(r, 400));
    expect(ctl.hasPro()).toBe(true);
  });
  it('offline: cached entitlement is kept; failed purchase shows a friendly message', async () => {
    const { ctl, mock } = make();
    await ctl.init();
    await ctl.buy();
    expect(ctl.hasPro()).toBe(true);
    mock.setOpts({ offline: true });
    await ctl.refresh();
    expect(ctl.hasPro()).toBe(true); // unknown → keep cache
    const free = make();
    free.mock.setOpts({ offline: true });
    await free.ctl.init();
    await free.ctl.buy();
    expect(free.ctl.hasPro()).toBe(false);
    expect(free.ctl.state.message).toMatch(/Can.t reach the App Store/);
  });
  it('a refund (definitely not owned) revokes the cached entitlement', async () => {
    const { ctl, mock } = make();
    await ctl.init();
    await ctl.buy();
    mock.setOwned(false);
    await ctl.refresh();
    expect(ctl.hasPro()).toBe(false);
  });
  it('reconcile keeps the cache only when ownership is unknown', () => {
    expect(reconcile(true, null)).toBe(true);
    expect(reconcile(false, null)).toBe(false);
    expect(reconcile(true, false)).toBe(false);
    expect(reconcile(false, true)).toBe(true);
  });
});
