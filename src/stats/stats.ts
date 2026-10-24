import type { DealSpeed } from '../game/reveal';
import { storage } from '../storage';
import type { HandKind, Rules, Up } from '../engine/types';
import { DEFAULT_RULES, UPCARDS } from '../engine/types';
import { cellKey, parseCellKey, type CellRef } from '../engine/decide';
import type { Spread, TcConvention } from '../count/hilo';

export interface Tally { n: number; correct: number; lastWrong?: boolean }
export interface ModeStats {
  cells: Record<string, Tally>;
  kinds: Record<HandKind, Tally>;
}
export interface CountSettings {
  /** seconds per card */
  speed: number;
  flashCards: number;
  flashDecks: number; // 0 = use flashCards, else full decks
  players: number;
  quizEvery: number;
  quizTc: boolean;
  showDecksLeft: boolean;
  tcConvention: TcConvention;
  tcTolerance: boolean;
  spread: Spread;
  countInPlay: boolean;
  playQuizEvery: number;
  /** grade against Hi-Lo index plays when counting */
  deviations: boolean;
  /** Pick (and get graded on) a count-based bet before each counted hand. Off = flat 1 unit. */
  betSizing: boolean;
}
export interface Settings {
  /** 0..1 share of deals aimed at weak spots in Play mode */
  focus: number;
  drillFilter: 'all' | HandKind | 'index';
  count: CountSettings;
  /** Pace of cards landing in Play. */
  dealSpeed: DealSpeed;
  /** Haptic feedback on the iOS app (no effect on the web). */
  haptics: boolean;
}
export interface ErrTally { n: number; correct: number; absErr: number }
export interface FlashResult { ts: number; cards: number; speed: number; answer: number; actual: number }
export interface CountStats {
  flash: ErrTally & { bestSpeed: number | null; history: FlashResult[] };
  rounds: { rc: ErrTally; tc: ErrTally; bestSpeed: number | null; rounds: number };
  play: { rc: ErrTally; tc: ErrTally; bet: { n: number; correct: number; absErr: number } };
}
export const emptyErr = (): ErrTally => ({ n: 0, correct: 0, absErr: 0 });
export function recordErr(t: ErrTally, answer: number, actual: number, correct: boolean) {
  t.n++;
  if (correct) t.correct++;
  t.absErr += Math.abs(answer - actual);
}
export const DEFAULT_COUNT_SETTINGS: CountSettings = {
  speed: 1, flashCards: 20, flashDecks: 0, players: 3, quizEvery: 1, quizTc: true, showDecksLeft: true,
  tcConvention: 'truncate', tcTolerance: false, spread: '1-8', countInPlay: false, playQuizEvery: 5, deviations: true, betSizing: true,
};
export const freshCountStats = (): CountStats => ({
  flash: { ...emptyErr(), bestSpeed: null, history: [] },
  rounds: { rc: emptyErr(), tc: emptyErr(), bestSpeed: null, rounds: 0 },
  play: { rc: emptyErr(), tc: emptyErr(), bet: { n: 0, correct: 0, absErr: 0 } },
});
/** Everything that is counted per rule set. */
export interface Bucket {
  play: ModeStats & { hands: number; net: number };
  drill: ModeStats;
  count: CountStats;
  dev: { drill: Record<string, Tally>; play: Record<string, Tally> };
}
export interface Store extends Bucket {
  version: 2;
  rules: Rules;
  settings: Settings;
  /**
   * Stats are kept per rule set (see rulesSig). `play/drill/count/dev` above always alias the bucket of the
   * current rules so the rest of the app can read and write them directly; `applyMutation` keeps `buckets` in sync.
   */
  buckets: Record<string, Bucket>;
}

export const KEY = 'bj-trainer:v1'; // key kept from v1; the payload is versioned inside

const emptyMode = (): ModeStats => ({
  cells: {},
  kinds: { hard: { n: 0, correct: 0 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } },
});
export const freshBucket = (): Bucket => ({
  play: { ...emptyMode(), hands: 0, net: 0 },
  drill: emptyMode(),
  count: freshCountStats(),
  dev: { drill: {}, play: {} },
});

/** Stable id for the rules that affect strategy/payout: e.g. "6D-H17-DAS-LS-3:2". */
export function rulesSig(r: Rules): string {
  return `${r.decks}D-${r.h17 ? 'H17' : 'S17'}-${r.das ? 'DAS' : 'noDAS'}-${r.surrender === 'late' ? 'LS' : 'noLS'}-${r.blackjackPays}`;
}
export function sigLabel(sig: string): string {
  const [d, h, das, ls, bj] = sig.split('-');
  return `${d.replace('D', d === '1D' ? ' deck' : ' decks')} · ${h} · ${das === 'DAS' ? 'DAS' : 'no DAS'} · ${ls === 'LS' ? 'LS' : 'no surr.'} · ${bj}`;
}
export const DEFAULT_SIG = rulesSig(DEFAULT_RULES);
/** Inverse of rulesSig (maxHands comes from the defaults). */
export function rulesFromSig(sig: string): Rules {
  const [d, h, das, ls, bj] = sig.split('-');
  return { ...DEFAULT_RULES, decks: Number(d.replace('D', '')) as Rules['decks'], h17: h === 'H17', das: das === 'DAS', surrender: ls === 'LS' ? 'late' : 'none', blackjackPays: bj as Rules['blackjackPays'] };
}

const addTally = (a: Tally | undefined, b: Tally | undefined): Tally | undefined =>
  !a && !b ? undefined : { n: (a?.n ?? 0) + (b?.n ?? 0), correct: (a?.correct ?? 0) + (b?.correct ?? 0), lastWrong: a?.lastWrong || b?.lastWrong };
const mergeTallies = (ms: Record<string, Tally>[]): Record<string, Tally> => {
  const out: Record<string, Tally> = {};
  for (const m of ms) for (const [k, t] of Object.entries(m)) out[k] = addTally(out[k], t)!;
  return out;
};
const mergeMode = (ms: ModeStats[]): ModeStats => {
  const out = emptyMode();
  out.cells = mergeTallies(ms.map((m) => m.cells));
  for (const k of ['hard', 'soft', 'pair'] as HandKind[]) out.kinds[k] = ms.reduce((a, m) => addTally(a, m.kinds[k])!, { n: 0, correct: 0 } as Tally);
  return out;
};
const addErr = (a: ErrTally, b: ErrTally): ErrTally => ({ n: a.n + b.n, correct: a.correct + b.correct, absErr: a.absErr + b.absErr });
const minSpeed = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.min(a, b));
/** Sum several buckets (used for the "All rule sets" stats view). */
export function mergeBuckets(bs: Bucket[]): Bucket {
  const out = freshBucket();
  for (const b of bs) {
    out.count.flash = { ...addErr(out.count.flash, b.count.flash), bestSpeed: minSpeed(out.count.flash.bestSpeed, b.count.flash.bestSpeed), history: [...out.count.flash.history, ...b.count.flash.history] };
    out.count.rounds = { rc: addErr(out.count.rounds.rc, b.count.rounds.rc), tc: addErr(out.count.rounds.tc, b.count.rounds.tc), bestSpeed: minSpeed(out.count.rounds.bestSpeed, b.count.rounds.bestSpeed), rounds: out.count.rounds.rounds + b.count.rounds.rounds };
    out.count.play = { rc: addErr(out.count.play.rc, b.count.play.rc), tc: addErr(out.count.play.tc, b.count.play.tc), bet: addErr(out.count.play.bet, b.count.play.bet) };
  }
  out.count.flash.history = out.count.flash.history.sort((x, y) => x.ts - y.ts).slice(-50);
  const pm = mergeMode(bs.map((b) => b.play));
  out.play = { ...pm, hands: bs.reduce((a, b) => a + b.play.hands, 0), net: bs.reduce((a, b) => a + b.play.net, 0) };
  out.drill = mergeMode(bs.map((b) => b.drill));
  out.dev = { drill: mergeTallies(bs.map((b) => b.dev.drill)), play: mergeTallies(bs.map((b) => b.dev.play)) };
  return out;
}

export function freshStore(): Store {
  const b = freshBucket();
  return {
    version: 2,
    rules: { ...DEFAULT_RULES },
    settings: { focus: 0.4, drillFilter: 'all', dealSpeed: 'normal', haptics: true, count: { ...DEFAULT_COUNT_SETTINGS } },
    ...b,
    buckets: { [DEFAULT_SIG]: b },
  };
}

const normBucket = (b: Partial<Bucket> | undefined): Bucket => {
  const f = freshBucket();
  const cs = b?.count ?? f.count;
  return {
    play: { ...f.play, ...(b?.play ?? {}), cells: { ...(b?.play?.cells ?? {}) }, kinds: { ...f.play.kinds, ...(b?.play?.kinds ?? {}) } },
    drill: { ...f.drill, ...(b?.drill ?? {}), cells: { ...(b?.drill?.cells ?? {}) }, kinds: { ...f.drill.kinds, ...(b?.drill?.kinds ?? {}) } },
    dev: { drill: { ...(b?.dev?.drill ?? {}) }, play: { ...(b?.dev?.play ?? {}) } },
    count: {
      flash: { ...f.count.flash, ...cs.flash },
      rounds: { ...f.count.rounds, ...cs.rounds },
      play: { ...f.count.play, ...cs.play },
    },
  };
};

/** Turn a parsed saved object (v1 or v2, possibly from a backup) into a valid Store. */
export function hydrateStore(raw: any): Store {
  const f = freshStore();
  const rules: Rules = { ...f.rules, ...(raw?.rules ?? {}) };
  const settings: Settings = { ...f.settings, ...(raw?.settings ?? {}), count: { ...DEFAULT_COUNT_SETTINGS, ...(raw?.settings?.count ?? {}) } };
  const buckets: Record<string, Bucket> = {};
  if (raw?.buckets && typeof raw.buckets === 'object') {
    for (const [k, b] of Object.entries(raw.buckets)) buckets[k] = normBucket(b as Partial<Bucket>);
  } else {
    // v1 save: everything so far goes into the default-rules bucket so nothing is lost
    buckets[DEFAULT_SIG] = normBucket({ play: raw?.play, drill: raw?.drill, count: raw?.count, dev: raw?.dev });
  }
  const sig = rulesSig(rules);
  const cur = (buckets[sig] ??= freshBucket());
  return { version: 2, rules, settings, buckets, play: cur.play, drill: cur.drill, count: cur.count, dev: cur.dev };
}

export function loadStore(): Store {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return freshStore();
    return hydrateStore(JSON.parse(raw));
  } catch {
    return freshStore();
  }
}

/** The persisted form: aliases folded back into their bucket. */
export function serializeStore(s: Store): string {
  const { play, drill, count, dev, buckets, ...rest } = s;
  return JSON.stringify({ ...rest, buckets: { ...buckets, [rulesSig(s.rules)]: { play, drill, count, dev } } });
}

export function saveStore(s: Store) {
  storage.setItem(KEY, serializeStore(s));
}

/** Clone, run `fn`, then re-point the stats aliases if the rules changed (stats follow the rule set). */
export function applyMutation(prev: Store, fn: (s: Store) => void): Store {
  const next = structuredClone(prev);
  const oldSig = rulesSig(next.rules);
  fn(next);
  next.buckets[oldSig] = { play: next.play, drill: next.drill, count: next.count, dev: next.dev };
  const newSig = rulesSig(next.rules);
  const b = (next.buckets[newSig] ??= freshBucket());
  next.play = b.play; next.drill = b.drill; next.count = b.count; next.dev = b.dev;
  return next;
}

/** A read-only Store whose stats fields show the chosen scope: 'all' rule sets, or one rule-set signature. */
export function statsView(store: Store, sel: 'all' | string): Store {
  const cur = rulesSig(store.rules);
  const all = { ...store.buckets, [cur]: { play: store.play, drill: store.drill, count: store.count, dev: store.dev } };
  const b = sel === 'all' ? mergeBuckets(Object.values(all)) : (all[sel] ?? freshBucket());
  return { ...store, ...b };
}
/** Rule sets that have any recorded activity (current rules always listed). */
export function savedSigs(store: Store): string[] {
  const cur = rulesSig(store.rules);
  const all = { ...store.buckets, [cur]: { play: store.play, drill: store.drill, count: store.count, dev: store.dev } };
  const used = (b: Bucket) => b.play.hands > 0 || Object.keys(b.play.cells).length > 0 || Object.keys(b.drill.cells).length > 0 || b.count.flash.n + b.count.rounds.rc.n + b.count.play.rc.n + b.count.play.bet.n > 0 || Object.keys(b.dev.play).length + Object.keys(b.dev.drill).length > 0;
  return Object.keys(all).filter((k) => k === cur || used(all[k])).sort((a, b) => (a === cur ? -1 : b === cur ? 1 : a.localeCompare(b)));
}

export function record(m: ModeStats, cell: CellRef, correct: boolean) {
  const k = cellKey(cell);
  const t = (m.cells[k] ??= { n: 0, correct: 0 });
  t.n++;
  if (correct) t.correct++;
  t.lastWrong = !correct;
  const kt = m.kinds[cell.kind];
  kt.n++;
  if (correct) kt.correct++;
}

/** Every cell a drill/targeted deal can produce. */
export function allCells(filter: 'all' | HandKind | 'index' = 'all'): CellRef[] {
  if (filter === 'index') filter = 'all';
  const out: CellRef[] = [];
  for (const up of UPCARDS as Up[]) {
    if (filter === 'all' || filter === 'hard') for (let t = 5; t <= 19; t++) out.push({ kind: 'hard', row: t, up });
    if (filter === 'all' || filter === 'soft') for (let t = 13; t <= 20; t++) out.push({ kind: 'soft', row: t, up });
    if (filter === 'all' || filter === 'pair') for (let p = 2; p <= 11; p++) out.push({ kind: 'pair', row: p, up });
  }
  return out;
}

/**
 * Weight for picking a cell: unseen and frequently-missed cells come up more.
 * Smoothed miss rate (misses+1)/(n+2), doubled if the last attempt was wrong.
 */
export function cellWeight(t: Tally | undefined): number {
  if (!t) return 1.6;
  const miss = (t.n - t.correct + 1) / (t.n + 2);
  return 0.15 + 3 * miss * (t.lastWrong ? 2 : 1);
}

export function combinedTally(store: Store, k: string): Tally | undefined {
  const a = store.play.cells[k];
  const b = store.drill.cells[k];
  if (!a && !b) return undefined;
  return {
    n: (a?.n ?? 0) + (b?.n ?? 0),
    correct: (a?.correct ?? 0) + (b?.correct ?? 0),
    lastWrong: a?.lastWrong || b?.lastWrong,
  };
}

export function pickWeighted<T>(cells: T[], weight: (c: T) => number, rng: () => number = Math.random): T {
  const ws = cells.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < cells.length; i++) {
    x -= ws[i];
    if (x <= 0) return cells[i];
  }
  return cells[cells.length - 1];
}

export function weakSpots(store: Store, min = 2): { cell: CellRef; t: Tally; acc: number }[] {
  const keys = new Set([...Object.keys(store.play.cells), ...Object.keys(store.drill.cells)]);
  return [...keys]
    .map((k) => ({ cell: parseCellKey(k), t: combinedTally(store, k)! }))
    .filter((x) => x.t.n >= min && x.t.correct < x.t.n)
    .map((x) => ({ ...x, acc: x.t.correct / x.t.n }))
    .sort((a, b) => a.acc - b.acc || b.t.n - a.t.n);
}

export const pct = (t: Tally | undefined) => (t && t.n ? Math.round((100 * t.correct) / t.n) : null);

export function recordDev(m: Record<string, Tally>, id: string, correct: boolean) {
  const t = (m[id] ??= { n: 0, correct: 0 });
  t.n++;
  if (correct) t.correct++;
  t.lastWrong = !correct;
}
export function devTally(store: Store, id: string): Tally | undefined {
  const a = store.dev.drill[id];
  const b = store.dev.play[id];
  if (!a && !b) return undefined;
  return { n: (a?.n ?? 0) + (b?.n ?? 0), correct: (a?.correct ?? 0) + (b?.correct ?? 0), lastWrong: a?.lastWrong || b?.lastWrong };
}
