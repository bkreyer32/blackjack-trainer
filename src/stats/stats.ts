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
}
export interface Settings {
  /** 0..1 share of deals aimed at weak spots in Play mode */
  focus: number;
  drillFilter: 'all' | HandKind;
  count: CountSettings;
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
  tcConvention: 'truncate', tcTolerance: false, spread: '1-8', countInPlay: false, playQuizEvery: 5,
};
export const freshCountStats = (): CountStats => ({
  flash: { ...emptyErr(), bestSpeed: null, history: [] },
  rounds: { rc: emptyErr(), tc: emptyErr(), bestSpeed: null, rounds: 0 },
  play: { rc: emptyErr(), tc: emptyErr(), bet: { n: 0, correct: 0, absErr: 0 } },
});
export interface Store {
  version: 1;
  rules: Rules;
  settings: Settings;
  play: ModeStats & { hands: number; net: number };
  drill: ModeStats;
  count: CountStats;
}

const KEY = 'bj-trainer:v1';

const emptyMode = (): ModeStats => ({
  cells: {},
  kinds: { hard: { n: 0, correct: 0 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } },
});

export function freshStore(): Store {
  return {
    version: 1,
    rules: { ...DEFAULT_RULES },
    settings: { focus: 0.4, drillFilter: 'all', count: { ...DEFAULT_COUNT_SETTINGS } },
    play: { ...emptyMode(), hands: 0, net: 0 },
    drill: emptyMode(),
    count: freshCountStats(),
  };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshStore();
    const s = JSON.parse(raw) as Store;
    const f = freshStore();
    const cs = s.count ?? f.count;
    return {
      ...f, ...s,
      rules: { ...f.rules, ...s.rules },
      settings: { ...f.settings, ...s.settings, count: { ...DEFAULT_COUNT_SETTINGS, ...(s.settings?.count ?? {}) } },
      count: {
        flash: { ...f.count.flash, ...cs.flash },
        rounds: { ...f.count.rounds, ...cs.rounds },
        play: { ...f.count.play, ...cs.play },
      },
    };
  } catch {
    return freshStore();
  }
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full / private mode */
  }
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
export function allCells(filter: 'all' | HandKind = 'all'): CellRef[] {
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

export function pickWeighted(cells: CellRef[], weight: (c: CellRef) => number, rng: () => number = Math.random): CellRef {
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
