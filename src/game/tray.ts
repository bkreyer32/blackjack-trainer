/** Discard-tray maths. Discards = every card from completed rounds; cards in the current hand are not in the tray yet. */
export type TrayLevel = 'ok' | 'near' | 'cut';
export interface TrayState {
  /** 0..1 height of the stack relative to a full shoe */
  fill: number;
  /** 0..1 height of the cut-card marker (penetration) */
  cut: number;
  /** whole-number percent of the shoe in the tray */
  pct: number;
  level: TrayLevel;
}
export const NEAR_CUT = 0.85; // share of the way to the cut card at which the stack turns amber

/** Cards in the tray once a round has finished: everything that has left the shoe. Clamped to [0,total]. */
export function discardsAfterRound(total: number, shoeRemaining: number): number {
  return Math.min(total, Math.max(0, total - shoeRemaining));
}

export function trayState(discarded: number, total: number, cutRemaining: number): TrayState {
  const fill = total > 0 ? Math.min(1, Math.max(0, discarded / total)) : 0;
  const cutDiscards = total - cutRemaining; // discards at which the cut card is reached
  const cut = total > 0 ? cutDiscards / total : 0.75;
  const level: TrayLevel = discarded >= cutDiscards ? 'cut' : discarded >= NEAR_CUT * cutDiscards ? 'near' : 'ok';
  return { fill, cut, pct: Math.round(fill * 100), level };
}
