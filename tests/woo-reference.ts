/**
 * Wizard of Odds basic strategy charts, transcribed cell-by-cell from
 * https://wizardofodds.com/games/blackjack/strategy/{4-decks,2-decks,1-deck}/
 * (chart images saved under reference/woo/). Columns: dealer 2 3 4 5 6 7 8 9 10 A.
 *
 * Legend: H hit, S stand, Dh double/else hit, Ds double/else stand, P split,
 * Ph split if DAS else hit, Pd split if DAS else double, Ps split if DAS else stand,
 * Rh surrender/else hit, Rs surrender/else stand, Rp surrender/else split,
 * Rp* (2D H17 8,8 v A) surrender if allowed AND DAS not allowed, otherwise split.
 *
 * Row keys: hard totals, soft totals ("A,2" = 13 ... "A,9" = 20), pairs by card (A = 11).
 * Rows the chart shows as a range ("4-8", "18+") are expanded to each total they cover.
 */
export interface RefChart {
  name: string;
  decks: number[];
  h17: boolean;
  hard: Record<number, string>;
  soft: Record<number, string>;
  pairs: Record<number, string>;
}

const S10 = 'S S S S S S S S S S';
const H10 = 'H H H H H H H H H H';
const P10 = 'P P P P P P P P P P';

function range(from: number, to: number, row: string): Record<number, string> {
  const o: Record<number, string> = {};
  for (let i = from; i <= to; i++) o[i] = row;
  return o;
}

export const WOO_4_8D_S17: RefChart = {
  name: '4-8 decks, dealer stands on soft 17',
  decks: [4, 6, 8],
  h17: false,
  hard: {
    ...range(5, 8, H10),
    9: 'H Dh Dh Dh Dh H H H H H',
    10: 'Dh Dh Dh Dh Dh Dh Dh Dh H H',
    11: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh H',
    12: 'H H S S S H H H H H',
    13: 'S S S S S H H H H H',
    14: 'S S S S S H H H H H',
    15: 'S S S S S H H H Rh H',
    16: 'S S S S S H H Rh Rh Rh',
    ...range(17, 21, S10),
  },
  soft: {
    13: 'H H H Dh Dh H H H H H',
    14: 'H H H Dh Dh H H H H H',
    15: 'H H Dh Dh Dh H H H H H',
    16: 'H H Dh Dh Dh H H H H H',
    17: 'H Dh Dh Dh Dh H H H H H',
    18: 'S Ds Ds Ds Ds S S H H H',
    ...range(19, 21, S10),
  },
  pairs: {
    2: 'Ph Ph P P P P H H H H',
    3: 'Ph Ph P P P P H H H H',
    4: 'H H H Ph Ph H H H H H',
    6: 'Ph P P P P H H H H H',
    7: 'P P P P P P H H H H',
    8: P10,
    9: 'P P P P P S P P S S',
    11: P10,
  },
};

export const WOO_4_8D_H17: RefChart = {
  name: '4-8 decks, dealer hits soft 17',
  decks: [4, 6, 8],
  h17: true,
  hard: {
    ...range(5, 8, H10),
    9: 'H Dh Dh Dh Dh H H H H H',
    10: 'Dh Dh Dh Dh Dh Dh Dh Dh H H',
    11: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh Dh',
    12: 'H H S S S H H H H H',
    13: 'S S S S S H H H H H',
    14: 'S S S S S H H H H H',
    15: 'S S S S S H H H Rh Rh',
    16: 'S S S S S H H Rh Rh Rh',
    17: 'S S S S S S S S S Rs',
    ...range(18, 21, S10),
  },
  soft: {
    13: 'H H H Dh Dh H H H H H',
    14: 'H H H Dh Dh H H H H H',
    15: 'H H Dh Dh Dh H H H H H',
    16: 'H H Dh Dh Dh H H H H H',
    17: 'H Dh Dh Dh Dh H H H H H',
    18: 'Ds Ds Ds Ds Ds S S H H H',
    19: 'S S S S Ds S S S S S',
    ...range(20, 21, S10),
  },
  pairs: {
    2: 'Ph Ph P P P P H H H H',
    3: 'Ph Ph P P P P H H H H',
    4: 'H H H Ph Ph H H H H H',
    6: 'Ph P P P P H H H H H',
    7: 'P P P P P P H H H H',
    8: 'P P P P P P P P P Rp',
    9: 'P P P P P S P P S S',
    11: P10,
  },
};

export const WOO_2D_H17: RefChart = {
  name: 'Double deck, dealer hits soft 17',
  decks: [2],
  h17: true,
  hard: {
    ...range(4, 8, H10),
    9: 'Dh Dh Dh Dh Dh H H H H H',
    10: 'Dh Dh Dh Dh Dh Dh Dh Dh H H',
    11: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh Dh',
    12: 'H H S S S H H H H H',
    13: 'S S S S S H H H H H',
    14: 'S S S S S H H H H H',
    15: 'S S S S S H H H Rh Rh',
    16: 'S S S S S H H H Rh Rh',
    17: 'S S S S S S S S S Rs',
    ...range(18, 21, S10),
  },
  soft: {
    13: 'H H H Dh Dh H H H H H',
    14: 'H H Dh Dh Dh H H H H H',
    15: 'H H Dh Dh Dh H H H H H',
    16: 'H H Dh Dh Dh H H H H H',
    17: 'H Dh Dh Dh Dh H H H H H',
    18: 'Ds Ds Ds Ds Ds S S H H H',
    19: 'S S S S Ds S S S S S',
    ...range(20, 21, S10),
  },
  pairs: {
    2: 'Ph Ph P P P P H H H H',
    3: 'Ph Ph P P P P H H H H',
    4: 'H H H Ph Ph H H H H H',
    6: 'P P P P P Ph H H H H',
    7: 'P P P P P P Ph H H H',
    8: 'P P P P P P P P P Rp*',
    9: 'P P P P P S P P S S',
    11: P10,
  },
};

export const WOO_2D_S17: RefChart = {
  name: 'Double deck, dealer stands on soft 17',
  decks: [2],
  h17: false,
  hard: {
    ...range(4, 8, H10),
    9: 'Dh Dh Dh Dh Dh H H H H H',
    10: 'Dh Dh Dh Dh Dh Dh Dh Dh H H',
    11: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh Dh',
    12: 'H H S S S H H H H H',
    13: 'S S S S S H H H H H',
    14: 'S S S S S H H H H H',
    15: 'S S S S S H H H Rh H',
    16: 'S S S S S H H H Rh Rh',
    ...range(17, 21, S10),
  },
  soft: {
    13: 'H H H Dh Dh H H H H H',
    14: 'H H H Dh Dh H H H H H',
    15: 'H H Dh Dh Dh H H H H H',
    16: 'H H Dh Dh Dh H H H H H',
    17: 'H Dh Dh Dh Dh H H H H H',
    18: 'S Ds Ds Ds Ds S S H H H',
    ...range(19, 21, S10),
  },
  pairs: {
    2: 'Ph Ph P P P P H H H H',
    3: 'Ph Ph P P P P H H H H',
    4: 'H H H Ph Ph H H H H H',
    6: 'P P P P P Ph H H H H',
    7: 'P P P P P P Ph H H H',
    8: P10,
    9: 'P P P P P S P P S S',
    11: P10,
  },
};

export const WOO_1D_H17: RefChart = {
  name: 'Single deck, dealer hits soft 17',
  decks: [1],
  h17: true,
  hard: {
    ...range(4, 7, H10),
    8: 'H H H Dh Dh H H H H H',
    9: 'Dh Dh Dh Dh Dh H H H H H',
    10: 'Dh Dh Dh Dh Dh Dh Dh Dh H H',
    11: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh Dh',
    12: 'H H S S S H H H H H',
    13: 'S S S S S H H H H H',
    14: 'S S S S S H H H H H',
    15: 'S S S S S H H H H Rh',
    16: 'S S S S S H H H Rh Rh',
    17: 'S S S S S S S S S Rs',
    ...range(18, 21, S10),
  },
  soft: {
    13: 'H H Dh Dh Dh H H H H H',
    14: 'H H Dh Dh Dh H H H H H',
    15: 'H H Dh Dh Dh H H H H H',
    16: 'H H Dh Dh Dh H H H H H',
    17: 'Dh Dh Dh Dh Dh H H H H H',
    18: 'S Ds Ds Ds Ds S S H H H',
    19: 'S S S S Ds S S S S S',
    ...range(20, 21, S10),
  },
  pairs: {
    2: 'Ph P P P P P H H H H',
    3: 'Ph Ph P P P P Ph H H H',
    4: 'H H Ph Pd Pd H H H H H',
    6: 'P P P P P Ph H H H H',
    7: 'P P P P P P Ph H Rs Rh',
    8: P10,
    9: 'P P P P P S P P S Ps',
    11: P10,
  },
};

export const WOO_1D_S17: RefChart = {
  name: 'Single deck, dealer stands on soft 17',
  decks: [1],
  h17: false,
  hard: {
    ...range(5, 7, H10),
    8: 'H H H Dh Dh H H H H H',
    9: 'Dh Dh Dh Dh Dh H H H H H',
    10: 'Dh Dh Dh Dh Dh Dh Dh Dh H H',
    11: 'Dh Dh Dh Dh Dh Dh Dh Dh Dh Dh',
    12: 'H H S S S H H H H H',
    13: 'S S S S S H H H H H',
    14: 'S S S S S H H H H H',
    15: 'S S S S S H H H H H',
    16: 'S S S S S H H H Rh Rh',
    ...range(17, 21, S10),
  },
  soft: {
    13: 'H H Dh Dh Dh H H H H H',
    14: 'H H Dh Dh Dh H H H H H',
    15: 'H H Dh Dh Dh H H H H H',
    16: 'H H Dh Dh Dh H H H H H',
    17: 'Dh Dh Dh Dh Dh H H H H H',
    18: 'S Ds Ds Ds Ds S S H H S',
    19: 'S S S S Ds S S S S S',
    ...range(20, 21, S10),
  },
  pairs: {
    2: 'Ph P P P P P H H H H',
    3: 'Ph Ph P P P P Ph H H H',
    4: 'H H Ph Pd Pd H H H H H',
    6: 'P P P P P Ph H H H H',
    7: 'P P P P P P Ph H Rs H',
    8: P10,
    9: 'P P P P P S P P S S',
    11: P10,
  },
};

export const ALL_REFS = [WOO_4_8D_S17, WOO_4_8D_H17, WOO_2D_H17, WOO_2D_S17, WOO_1D_H17, WOO_1D_S17];
