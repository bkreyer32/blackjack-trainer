import { describe, it, expect } from 'vitest';
import { DEFAULT_RULES } from '../src/engine/types';
import { hydrateStore, serializeStore, applyMutation, statsView, savedSigs, freshStore, rulesSig, sigLabel, DEFAULT_SIG, record } from '../src/stats/stats';

const v1 = {
  version: 1, rules: { ...DEFAULT_RULES }, settings: { focus: 0.4, drillFilter: 'all', count: {} },
  play: { cells: { 'hard:16:10': { n: 4, correct: 3 } }, kinds: { hard: { n: 4, correct: 3 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } }, hands: 7, net: 3 },
  drill: { cells: {}, kinds: { hard: { n: 0, correct: 0 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } } },
  count: undefined, dev: { drill: { '16v10': { n: 2, correct: 2 } }, play: {} },
};

describe('stats by rule set', () => {
  it('signature and label', () => {
    expect(DEFAULT_SIG).toBe('6D-H17-DAS-LS-3:2');
    expect(sigLabel(DEFAULT_SIG)).toBe('6 decks · H17 · DAS · LS · 3:2');
    expect(sigLabel(rulesSig({ ...DEFAULT_RULES, decks: 1, h17: false, das: false, surrender: 'none', blackjackPays: '6:5' }))).toBe('1 deck · S17 · no DAS · no surr. · 6:5');
  });
  it('migrates an old (v1) save into the default-rules bucket, losing nothing', () => {
    const s = hydrateStore(v1);
    expect(s.version).toBe(2);
    expect(s.buckets[DEFAULT_SIG].play.hands).toBe(7);
    expect(s.play.hands).toBe(7);
    expect(s.dev.drill['16v10'].n).toBe(2);
    expect(s.count.play.bet.n).toBe(0); // missing sections get defaults
  });
  it('old stats stay in the default bucket even if current rules differ', () => {
    const s = hydrateStore({ ...v1, rules: { ...DEFAULT_RULES, decks: 1 } });
    expect(s.play.hands).toBe(0);
    expect(s.buckets[DEFAULT_SIG].play.hands).toBe(7);
  });
  it('changing rules switches to that rule set\'s stats; switching back restores', () => {
    let s = hydrateStore(v1);
    s = applyMutation(s, (st) => { st.rules = { ...st.rules, decks: 1 }; });
    expect(s.play.hands).toBe(0);
    s = applyMutation(s, (st) => { st.play.hands = 2; record(st.play, { kind: 'hard', row: 12, up: 4 }, true); });
    expect(savedSigs(s).sort()).toEqual([DEFAULT_SIG, '1D-H17-DAS-LS-3:2'].sort());
    s = applyMutation(s, (st) => { st.rules = { ...DEFAULT_RULES }; });
    expect(s.play.hands).toBe(7);
    s = applyMutation(s, (st) => { st.rules = { ...st.rules, decks: 1 }; });
    expect(s.play.hands).toBe(2);
  });
  it('All view sums rule sets; a single view shows only that one', () => {
    let s = hydrateStore(v1);
    s = applyMutation(s, (st) => { st.rules = { ...st.rules, decks: 1 }; });
    s = applyMutation(s, (st) => { st.play.hands = 3; st.play.net = 2; });
    expect(statsView(s, 'all').play.hands).toBe(10);
    expect(statsView(s, 'all').play.net).toBe(5);
    expect(statsView(s, DEFAULT_SIG).play.hands).toBe(7);
    expect(statsView(s, rulesSig(s.rules)).play.hands).toBe(3);
    expect(statsView(s, 'all').play.cells['hard:16:10'].n).toBe(4);
  });
  it('serialize → hydrate round-trips (used by backup/restore)', () => {
    let s = freshStore();
    s = applyMutation(s, (st) => { st.play.hands = 5; st.rules = { ...st.rules, h17: false }; });
    s = applyMutation(s, (st) => { st.play.hands = 9; });
    const back = hydrateStore(JSON.parse(serializeStore(s)));
    expect(back.play.hands).toBe(9);
    expect(back.buckets[DEFAULT_SIG].play.hands).toBe(5);
    expect(back.rules.h17).toBe(false);
  });
});
