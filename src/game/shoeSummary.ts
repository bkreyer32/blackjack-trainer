import type { CellRef } from '../engine/decide';
import { cellKey } from '../engine/decide';
import { rowLabel } from '../engine/explain';
import { upLabel } from '../engine/types';

export interface Pair { n: number; correct: number }
export interface ShoeStats {
  hands: number;
  decisions: Pair;
  /** per chart cell: attempts and misses during this shoe */
  cells: Record<string, { cell: CellRef; n: number; missed: number }>;
  rc: Pair; tc: Pair; bet: Pair;
  /** index-play decisions (incl. insurance) */
  dev: Pair;
}
const z = (): Pair => ({ n: 0, correct: 0 });
export const emptyShoeStats = (): ShoeStats => ({ hands: 0, decisions: z(), cells: {}, rc: z(), tc: z(), bet: z(), dev: z() });

export const addPair = (p: Pair, correct: boolean) => { p.n++; if (correct) p.correct++; };
export function recordShoeDecision(ss: ShoeStats, cell: CellRef, correct: boolean, isIndex: boolean) {
  addPair(ss.decisions, correct);
  const c = (ss.cells[cellKey(cell)] ??= { cell, n: 0, missed: 0 });
  c.n++;
  if (!correct) c.missed++;
  if (isIndex) addPair(ss.dev, correct);
}

export interface ShoeSummary {
  hands: number;
  decisions: number;
  accuracy: number | null; // percent
  weak: { label: string; n: number; missed: number }[];
  rc: Pair | null; tc: Pair | null; bet: Pair | null; dev: Pair | null;
}
const pctOf = (p: Pair) => (p.n ? Math.round((100 * p.correct) / p.n) : null);
export const pairPct = pctOf;

/** What to show after the shoe: totals, the 3 cells missed most, and count/bet/index accuracy if any were asked. */
export function summarizeShoe(ss: ShoeStats): ShoeSummary {
  const weak = Object.values(ss.cells)
    .filter((c) => c.missed > 0)
    .sort((a, b) => b.missed - a.missed || b.missed / b.n - a.missed / a.n)
    .slice(0, 3)
    .map((c) => ({ label: `${rowLabel(c.cell.kind, c.cell.row)} vs ${upLabel(c.cell.up)}`, n: c.n, missed: c.missed }));
  const orNull = (p: Pair) => (p.n ? p : null);
  return { hands: ss.hands, decisions: ss.decisions.n, accuracy: pctOf(ss.decisions), weak, rc: orNull(ss.rc), tc: orNull(ss.tc), bet: orNull(ss.bet), dev: orNull(ss.dev) };
}
