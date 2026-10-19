import type { ComponentType } from 'react';
import type { ModeProps } from './common';
import { Learn } from './Learn';
import { Drill } from './Drill';
import { Play } from './Play';
import { Stats } from './Stats';
import { Count } from './Count';

export interface ModeDef {
  id: string;
  label: string;
  icon: string;
  component: ComponentType<ModeProps>;
  soon?: boolean;
}

/** Add new modes here; the nav and router are driven by this list. */
export const MODES: ModeDef[] = [
  { id: 'learn', label: 'Learn', icon: '📖', component: Learn },
  { id: 'drill', label: 'Drill', icon: '🎯', component: Drill },
  { id: 'play', label: 'Play', icon: '🃏', component: Play },
  { id: 'stats', label: 'Stats', icon: '📊', component: Stats },
  { id: 'count', label: 'Count', icon: '🔢', component: Count },
];
