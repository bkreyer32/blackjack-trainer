import type { Action, Card, Code, Rules, Up } from './types';
import { upLabel } from './types';
import { handValue, isPair, cardValue } from './hand';
import { bestAction, codeAt, type Availability } from './decide';
import { chartFor } from './strategy';

/**
 * Hi-Lo index plays: Illustrious 18 + Fab 4 (Don Schlesinger, Blackjack Attack).
 *
 * CONVENTION (the book's): play the `above` action when the TRUE COUNT >= index,
 * otherwise play the `below` action. True count = running count / decks remaining,
 * compared EXACTLY (not truncated). For an integer index, "exact TC >= n" is the same
 * as "floor(TC) >= n", so e.g. 16 v 10 (index 0) stands at TC 0.0 and hits at TC -0.4.
 * Negative indices work the same way: 13 v 2 (index -1) stands at TC >= -1 and hits below -1.
 *
 * Indices are for 4-8 decks. Separate H17 and S17 sets. 1-2 deck games use the multi-deck
 * set (no freely published, reliable 1D/2D I18 table), except entries whose 1-2 deck basic
 * play differs from the multi-deck basic play are switched off (see applicability()).
 */
export type IndexAct = 'S' | 'H' | 'D' | 'P' | 'R' | 'I' | 'NI';
export type IndexGroup = 'Insurance' | 'I18' | 'Fab4';

export interface IndexPlay {
  id: string;
  group: IndexGroup;
  rank: number; // order of value within its list
  kind: 'hard' | 'pair' | 'insurance';
  row: number; // hard total or pair card value
  up: Up;
  index: number;
  above: IndexAct;
  below: IndexAct;
}

type Def = [id: string, group: IndexGroup, rank: number, kind: IndexPlay['kind'], row: number, up: Up, s17: number, h17: number, above: IndexAct, below: IndexAct];

// prettier-ignore
const DEFS: Def[] = [
  ['ins',     'Insurance', 1, 'insurance', 0, 11, 3, 3, 'I', 'NI'],
  ['16v10',   'I18', 2,  'hard', 16, 10,  0,  0, 'S', 'H'],
  ['15v10',   'I18', 3,  'hard', 15, 10,  4,  4, 'S', 'H'],
  ['TTv5',    'I18', 4,  'pair', 10, 5,   5,  5, 'P', 'S'],
  ['TTv6',    'I18', 5,  'pair', 10, 6,   4,  4, 'P', 'S'],
  ['10v10',   'I18', 6,  'hard', 10, 10,  4,  4, 'D', 'H'],
  ['12v3',    'I18', 7,  'hard', 12, 3,   2,  2, 'S', 'H'],
  ['12v2',    'I18', 8,  'hard', 12, 2,   3,  3, 'S', 'H'],
  ['11vA',    'I18', 9,  'hard', 11, 11,  1, -1, 'D', 'H'],
  ['9v2',     'I18', 10, 'hard', 9, 2,    1,  1, 'D', 'H'],
  ['10vA',    'I18', 11, 'hard', 10, 11,  4,  3, 'D', 'H'],
  ['9v7',     'I18', 12, 'hard', 9, 7,    3,  3, 'D', 'H'],
  ['16v9',    'I18', 13, 'hard', 16, 9,   5,  5, 'S', 'H'],
  ['13v2',    'I18', 14, 'hard', 13, 2,  -1, -1, 'S', 'H'],
  ['12v4',    'I18', 15, 'hard', 12, 4,   0,  0, 'S', 'H'],
  ['12v5',    'I18', 16, 'hard', 12, 5,  -2, -2, 'S', 'H'],
  ['12v6',    'I18', 17, 'hard', 12, 6,  -1, -3, 'S', 'H'],
  ['13v3',    'I18', 18, 'hard', 13, 3,  -2, -2, 'S', 'H'],
  ['14v10R',  'Fab4', 1, 'hard', 14, 10,  3,  3, 'R', 'H'],
  ['15v10R',  'Fab4', 2, 'hard', 15, 10,  0,  0, 'R', 'H'],
  ['15v9R',   'Fab4', 3, 'hard', 15, 9,   2,  2, 'R', 'H'],
  ['15vAR',   'Fab4', 4, 'hard', 15, 11,  1, -1, 'R', 'H'],
];

export function indexTable(h17: boolean): IndexPlay[] {
  return DEFS.map(([id, group, rank, kind, row, up, s17, h, above, below]) => ({ id, group, rank, kind, row, up, index: h17 ? h : s17, above, below }));
}

export const ACT_VERB: Record<IndexAct, string> = { S: 'stand', H: 'hit', D: 'double', P: 'split', R: 'surrender', I: 'take insurance', NI: 'no insurance' };

export function playName(p: IndexPlay): string {
  if (p.kind === 'insurance') return 'Insurance';
  const hand = p.kind === 'pair' ? '10,10' : String(p.row);
  return `${hand} vs ${upLabel(p.up)}`;
}
export const fmtTc = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function describeIndex(p: IndexPlay): string {
  return `${ACT_VERB[p.above]} at TC ≥ ${fmtTc(p.index)}, otherwise ${ACT_VERB[p.below]}`;
}

/** Collapse a chart code to the play it makes once surrender is off the table. */
function noSurr(c: Code): Code {
  return c === 'Rh' ? 'H' : c === 'Rs' ? 'S' : c === 'Rp' ? 'P' : c;
}

export interface Applicability { ok: boolean; note?: string }

/**
 * Is this index play valid under the given rules?
 * - Fab 4 needs late surrender.
 * - 1-2 decks: the multi-deck index is only used when the game's basic play for the cell matches
 *   the multi-deck basic play (otherwise the multi-deck index would contradict the correct
 *   neutral-count play, e.g. 9 v 2 is already a basic double in 1-2 decks).
 */
export function applicability(p: IndexPlay, rules: Rules): Applicability {
  if (p.group === 'Fab4' && rules.surrender !== 'late') return { ok: false, note: 'Needs late surrender (off in these rules).' };
  if (p.kind === 'insurance' || rules.decks >= 4) return { ok: true };
  const mine = chartFor(rules);
  const multi = chartFor({ ...rules, decks: 6 });
  const cell = { kind: p.kind as 'hard' | 'pair', row: p.row, up: p.up };
  const a = codeAt(mine, cell);
  const b = codeAt(multi, cell);
  const same = p.group === 'Fab4' ? a.startsWith('R') === b.startsWith('R') : noSurr(a) === noSurr(b);
  if (!same) return { ok: false, note: `Off in ${rules.decks}-deck games: basic strategy here is already ${a} (multi-deck basic is ${b}), so the multi-deck index doesn't apply.` };
  return { ok: true };
}

export function activeIndexPlays(rules: Rules): { play: IndexPlay; app: Applicability }[] {
  return indexTable(rules.h17).map((play) => ({ play, app: applicability(play, rules) }));
}

export interface PlayResult {
  action: Action;
  basic: Action;
  isDeviation: boolean;
  /** index play consulted for this hand (whether or not it changed the play) */
  index?: IndexPlay;
  reason?: string;
}

function toAction(a: IndexAct, av: Availability): Action {
  switch (a) {
    case 'S': return 'stand';
    case 'H': return 'hit';
    case 'D': return av.canDouble ? 'double' : 'hit';
    case 'P': return av.canSplit ? 'split' : 'stand';
    case 'R': return av.canSurrender ? 'surrender' : 'hit';
    default: return 'stand';
  }
}

const ACTION_VERB: Record<Action, string> = { hit: 'hit', stand: 'stand', double: 'double', split: 'split', surrender: 'surrender' };

function reasonFor(p: IndexPlay, tc: number, action: Action): string {
  const name = playName(p);
  const i = fmtTc(p.index);
  return tc >= p.index
    ? `${name}: ${ACT_VERB[p.above]} at TC ≥ ${i} (Hi-Lo index ${i})`
    : `${name}: ${ACTION_VERB[action]} below TC ${i} (Hi-Lo index ${i}; ${ACT_VERB[p.above]} at ${i} or higher)`;
}

/**
 * The correct play for a hand: basic strategy, or the Hi-Lo index play when the true count calls for it.
 * Pass `trueCount` (exact RC / decks remaining) to enable deviations; omit for pure basic strategy.
 */
export function correctPlay(cards: Card[], up: Up, rules: Rules, av: Availability, trueCount?: number): PlayResult {
  const chart = chartFor(rules);
  const basic = bestAction(chart, cards, up, av).action;
  if (trueCount === undefined) return { action: basic, basic, isDeviation: false };
  const tc = trueCount;
  const v = handValue(cards);
  const plays = activeIndexPlays(rules).filter((x) => x.app.ok).map((x) => x.play);
  const pair = isPair(cards);
  const hardKey = !v.soft && !(pair && cardValue(cards[0]) === 10) ? v.total : null;
  const find = (group: IndexGroup) =>
    plays.find((p) => p.group === group && p.up === up &&
      (p.kind === 'pair' ? pair && cardValue(cards[0]) === p.row : p.kind === 'hard' && hardKey === p.row && !pair));

  const done = (action: Action, p?: IndexPlay): PlayResult => ({
    action, basic, isDeviation: action !== basic, index: p, reason: p ? reasonFor(p, tc, action) : undefined,
  });

  // 1) Surrender decision first (Fab 4). Without a Fab 4 entry, basic surrenders stand (e.g. 16 v 10 with LS).
  const f = av.canSurrender ? find('Fab4') : undefined;
  if (f && tc >= f.index) return done('surrender', f);
  if (!f && av.canSurrender && basic === 'surrender') return done('surrender');
  // 2) Playing decision with surrender off the table.
  const avNoR: Availability = { ...av, canSurrender: false };
  const base = bestAction(chart, cards, up, avNoR).action;
  const p = find('I18');
  const act = p ? toAction(tc >= p.index ? p.above : p.below, avNoR) : base;
  // If basic would surrender but the count says don't (Fab 4 below index), credit the Fab 4 entry.
  if (f && basic === 'surrender') return done(act, f);
  return done(act, p ?? f);
}

/** Insurance: basic strategy never insures; Hi-Lo insures at TC >= +3. */
export function insuranceCorrect(trueCount: number | undefined): boolean {
  return trueCount !== undefined && trueCount >= 3;
}

export interface ChangedCell { kind: 'hard' | 'pair'; row: number; up: Up; code: Code; plays: IndexPlay[] }

/** Chart cells whose code differs from basic strategy at this true count. */
export function changedAt(rules: Rules, tc: number): ChangedCell[] {
  const chart = chartFor(rules);
  const seen = new Set<string>();
  const out: ChangedCell[] = [];
  for (const { play: p, app } of activeIndexPlays(rules)) {
    if (!app.ok || p.kind === 'insurance') continue;
    const kind = p.kind;
    const k = `${kind}${p.row}v${p.up}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const r = chartCodeAt(rules, kind, p.row, p.up, tc);
    if (r.code !== codeAt(chart, { kind, row: p.row, up: p.up })) out.push({ kind, row: p.row, up: p.up, code: r.code, plays: r.plays });
  }
  return out;
}

/** Chart code for a cell at a given true count (index plays applied), for the Learn chart overlay. */
export function chartCodeAt(rules: Rules, kind: 'hard' | 'soft' | 'pair', row: number, up: Up, tc: number): { code: Code; plays: IndexPlay[] } {
  const base = codeAt(chartFor(rules), { kind, row, up });
  const plays = activeIndexPlays(rules)
    .filter((x) => x.app.ok && x.play.kind === kind && x.play.row === row && x.play.up === up)
    .map((x) => x.play);
  if (!plays.length) return { code: base, plays };
  const fab = plays.find((p) => p.group === 'Fab4');
  const i18 = plays.find((p) => p.group === 'I18');
  let surr = base.startsWith('R');
  if (fab) surr = tc >= fab.index;
  let fallback: 'H' | 'S' | 'D' | 'P' = (() => {
    const n = noSurr(base);
    return n === 'Dh' || n === 'Ds' ? 'D' : (n as 'H' | 'S' | 'P');
  })();
  if (i18) fallback = (tc >= i18.index ? i18.above : i18.below) as 'H' | 'S' | 'D' | 'P';
  let code: Code;
  if (surr) code = fallback === 'S' ? 'Rs' : fallback === 'P' ? 'Rp' : 'Rh';
  else code = fallback === 'D' ? (base === 'Ds' ? 'Ds' : 'Dh') : fallback;
  return { code, plays };
}
