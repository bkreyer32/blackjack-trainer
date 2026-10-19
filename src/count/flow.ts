/** What happens before a counted Play hand. 'deal' = deal immediately at a flat 1 unit. */
export type PreStep = 'rc' | 'bet' | 'deal';
export function preHandStep(handsThisShoe: number, quizEvery: number, betSizing: boolean): PreStep {
  if (handsThisShoe > 0 && handsThisShoe % quizEvery === 0) return 'rc';
  return betSizing ? 'bet' : 'deal';
}
/** After a count quiz: pick a bet, or (bet sizing off) review the quiz result and deal at 1 unit. */
export function afterQuizStep(betSizing: boolean): 'bet' | 'review' {
  return betSizing ? 'bet' : 'review';
}
/** Bet used when bet sizing is off. */
export const FLAT_BET = 1;
