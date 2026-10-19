import type { Chart, Code, Rules, Up } from './types';
import { UPCARDS } from './types';

/**
 * Raw cell codes before rule resolution. Adds DAS-conditional split codes
 * (Ph / Pd / Ps) and a special "surrender only when DAS is not allowed" code.
 */
export type RawCode = Code | 'Ph' | 'Pd' | 'Ps' | 'RpNoDAS';

/**
 * Basic-strategy generator. Starts from the multi-deck (4-8D) S17 strategy and
 * applies the well-known rule/composition adjustments for deck count (1, 2, 4-8)
 * and H17. Total-dependent strategy, matching the Wizard of Odds charts.
 */
export function rawHard(total: number, up: Up, r: Rules): RawCode {
  const sd = r.decks === 1;
  const md = r.decks >= 4;
  const h17 = r.h17;
  if (total <= 7) return 'H';
  if (total === 8) return sd && (up === 5 || up === 6) ? 'Dh' : 'H';
  if (total === 9) {
    if (up >= 3 && up <= 6) return 'Dh';
    if (up === 2 && !md) return 'Dh';
    return 'H';
  }
  if (total === 10) return up <= 9 ? 'Dh' : 'H';
  if (total === 11) {
    if (up !== 11) return 'Dh';
    return h17 || !md ? 'Dh' : 'H';
  }
  if (total === 12) return up >= 4 && up <= 6 ? 'S' : 'H';
  if (total === 13 || total === 14) return up <= 6 ? 'S' : 'H';
  if (total === 15) {
    if (up <= 6) return 'S';
    if (up === 10) return sd ? 'H' : 'Rh';
    if (up === 11) return h17 ? 'Rh' : 'H';
    return 'H';
  }
  if (total === 16) {
    if (up <= 6) return 'S';
    if (up === 9) return md ? 'Rh' : 'H';
    if (up >= 10) return 'Rh';
    return 'H';
  }
  if (total === 17) return up === 11 && h17 ? 'Rs' : 'S';
  return 'S';
}

export function rawSoft(total: number, up: Up, r: Rules): RawCode {
  const sd = r.decks === 1;
  const dd = r.decks === 2;
  const h17 = r.h17;
  if (total <= 12) return 'H';
  if (total === 13) {
    if (up === 5 || up === 6) return 'Dh';
    if (up === 4 && sd) return 'Dh';
    return 'H';
  }
  if (total === 14) {
    if (up === 5 || up === 6) return 'Dh';
    if (up === 4 && (sd || (dd && h17))) return 'Dh';
    return 'H';
  }
  if (total === 15 || total === 16) return up >= 4 && up <= 6 ? 'Dh' : 'H';
  if (total === 17) {
    if (up >= 3 && up <= 6) return 'Dh';
    if (up === 2 && sd) return 'Dh';
    return 'H';
  }
  if (total === 18) {
    if (up === 2) return h17 && !sd ? 'Ds' : 'S';
    if (up <= 6) return 'Ds';
    if (up <= 8) return 'S';
    if (up === 11 && sd && !h17) return 'S';
    return 'H';
  }
  if (total === 19) return up === 6 && (h17 || sd) ? 'Ds' : 'S';
  return 'S';
}

/** pair: value of one card (2..10, 11 = aces) */
export function rawPair(pair: number, up: Up, r: Rules): RawCode {
  const sd = r.decks === 1;
  const dd = r.decks === 2;
  const md = r.decks >= 4;
  const h17 = r.h17;
  switch (pair) {
    case 11:
      return 'P';
    case 10:
      return 'S';
    case 9:
      if (up === 7 || up === 10) return 'S';
      if (up === 11) return sd && h17 ? 'Ps' : 'S';
      return 'P';
    case 8:
      if (up === 11 && h17) {
        if (md) return 'Rp';
        if (dd) return 'RpNoDAS';
      }
      return 'P';
    case 7:
      if (up <= 7) return 'P';
      if (up === 8) return md ? 'H' : 'Ph';
      if (up === 10) return sd ? 'Rs' : 'H';
      if (up === 11) return sd && h17 ? 'Rh' : 'H';
      return 'H';
    case 6:
      if (up === 2) return md ? 'Ph' : 'P';
      if (up <= 6) return 'P';
      if (up === 7) return md ? 'H' : 'Ph';
      return 'H';
    case 5:
      return rawHard(10, up, r);
    case 4:
      if (up === 5 || up === 6) return sd ? 'Pd' : 'Ph';
      if (up === 4) return sd ? 'Ph' : 'H';
      return 'H';
    case 3:
      if (up <= 3) return 'Ph';
      if (up <= 7) return 'P';
      if (up === 8) return sd ? 'Ph' : 'H';
      return 'H';
    case 2:
      if (up === 2) return 'Ph';
      if (up === 3) return sd ? 'P' : 'Ph';
      if (up <= 7) return 'P';
      return 'H';
  }
  throw new Error(`bad pair ${pair}`);
}

/** Resolve DAS-conditional and surrender codes for a concrete rule set. */
export function resolveRaw(code: RawCode, r: Rules, hardFallback: () => Code): Code {
  const surr = r.surrender !== 'none';
  switch (code) {
    case 'Ph':
      return r.das ? 'P' : 'H';
    case 'Pd':
      return r.das ? 'P' : hardFallback();
    case 'Ps':
      return r.das ? 'P' : 'S';
    case 'RpNoDAS':
      return surr && !r.das ? 'Rp' : 'P';
    case 'Rh':
      return surr ? 'Rh' : 'H';
    case 'Rs':
      return surr ? 'Rs' : 'S';
    case 'Rp':
      return surr ? 'Rp' : 'P';
    default:
      return code;
  }
}

export function generateChart(r: Rules): Chart {
  const hard: Record<number, Code[]> = {};
  const soft: Record<number, Code[]> = {};
  const pairs: Record<number, Code[]> = {};
  for (let t = 4; t <= 21; t++)
    hard[t] = UPCARDS.map((u) => resolveRaw(rawHard(t, u, r), r, () => 'H'));
  for (let t = 12; t <= 21; t++)
    soft[t] = UPCARDS.map((u) => resolveRaw(rawSoft(t, u, r), r, () => 'H'));
  for (let p = 2; p <= 11; p++)
    pairs[p] = UPCARDS.map((u) =>
      resolveRaw(rawPair(p, u, r), r, () => {
        const total = p === 11 ? 12 : p * 2;
        const raw = p === 11 ? rawSoft(12, u, r) : rawHard(total, u, r);
        return resolveRaw(raw, r, () => 'H');
      }),
    );
  return { rules: r, hard, soft, pairs };
}

const cache = new Map<string, Chart>();
export function chartFor(r: Rules): Chart {
  const k = `${r.decks}|${r.h17}|${r.das}|${r.surrender}`;
  let c = cache.get(k);
  if (!c) {
    c = generateChart(r);
    cache.set(k, c);
  }
  return c;
}

export function upIndex(u: Up): number {
  return u - 2;
}
