import type { Action, Card, Chart, Code, HandKind, Up } from './types';
import { handValue, isPair, cardValue } from './hand';
import { upIndex } from './strategy';

export interface Availability {
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

/** Identifies the chart cell a hand maps to. */
export interface CellRef {
  kind: HandKind;
  row: number; // hard/soft total, or pair card value (11 = aces)
  up: Up;
}

export function cellKey(c: CellRef): string {
  return `${c.kind}:${c.row}:${c.up}`;
}
export function parseCellKey(k: string): CellRef {
  const [kind, row, up] = k.split(':');
  return { kind: kind as HandKind, row: Number(row), up: Number(up) as Up };
}

/** Which cell the hand should be looked up in, given whether splitting is possible. */
export function cellFor(cards: Card[], up: Up, canSplit: boolean): CellRef {
  if (canSplit && isPair(cards)) return { kind: 'pair', row: cardValue(cards[0]), up };
  const v = handValue(cards);
  if (v.soft) return { kind: 'soft', row: v.total, up };
  return { kind: 'hard', row: Math.max(4, v.total), up };
}

export function codeAt(chart: Chart, cell: CellRef): Code {
  const table = cell.kind === 'hard' ? chart.hard : cell.kind === 'soft' ? chart.soft : chart.pairs;
  const row = table[Math.min(21, cell.row)];
  return row[upIndex(cell.up)];
}

/** Turn a chart code into a concrete action given what's allowed right now. */
export function resolveCode(code: Code, a: Availability, nonSplitCode: () => Code): Action {
  switch (code) {
    case 'H':
      return 'hit';
    case 'S':
      return 'stand';
    case 'Dh':
      return a.canDouble ? 'double' : 'hit';
    case 'Ds':
      return a.canDouble ? 'double' : 'stand';
    case 'Rh':
      return a.canSurrender ? 'surrender' : 'hit';
    case 'Rs':
      return a.canSurrender ? 'surrender' : 'stand';
    case 'Rp':
      if (a.canSurrender) return 'surrender';
      return a.canSplit ? 'split' : resolveCode(nonSplitCode(), a, nonSplitCode);
    case 'P':
      return a.canSplit ? 'split' : resolveCode(nonSplitCode(), a, nonSplitCode);
  }
}

export interface Decision {
  action: Action;
  code: Code;
  cell: CellRef;
}

export function bestAction(chart: Chart, cards: Card[], up: Up, a: Availability): Decision {
  const cell = cellFor(cards, up, true);
  const code = codeAt(chart, cell);
  const nonSplit = () => codeAt(chart, cellFor(cards, up, false));
  return { action: resolveCode(code, a, nonSplit), code, cell };
}
