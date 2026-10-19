import type { Chart } from '../engine/types';
import type { Store } from '../stats/stats';
import type { Action } from '../engine/types';

export interface ModeProps {
  store: Store;
  mutate: (fn: (s: Store) => void) => void;
  chart: Chart;
  openGuide: (page?: number) => void;
}

export const ACTION_LABEL: Record<Action, string> = {
  hit: 'Hit', stand: 'Stand', double: 'Double', split: 'Split', surrender: 'Surrender',
};
