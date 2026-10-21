import type { DeckCount, Rules } from '../engine/types';
import { DEFAULT_RULES } from '../engine/types';
import { DEAL_SPEED_LABEL, type DealSpeed } from '../game/reveal';
import type { ModeProps } from './common';
import { HelpBubble } from '../ui/HelpBubble';
import type { HelpId } from '../ui/help';

function Opt<T extends string | number | boolean>({ label, value, options, onChange, help }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; help: HelpId }) {
  return (
    <div className="opt">
      <div className="opt-label with-help">{label}<HelpBubble id={help} label={label} /></div>
      <div className="seg small">
        {options.map(([v, l]) => <button key={String(v)} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
      </div>
    </div>
  );
}

export function SettingsPanel({ store, mutate }: Omit<ModeProps, 'chart'>) {
  const r = store.rules;
  const set = (patch: Partial<Rules>) => mutate((s) => { s.rules = { ...s.rules, ...patch }; });
  return (
    <div className="settings">
      <Opt<DeckCount> help="decks" label="Decks" value={r.decks} options={[[1, '1'], [2, '2'], [4, '4'], [6, '6'], [8, '8']]} onChange={(v) => set({ decks: v })} />
      <Opt<boolean> help="h17" label="Dealer soft 17" value={r.h17} options={[[true, 'Hits (H17)'], [false, 'Stands (S17)']]} onChange={(v) => set({ h17: v })} />
      <Opt<boolean> help="das" label="Double after split" value={r.das} options={[[true, 'Allowed'], [false, 'No']]} onChange={(v) => set({ das: v })} />
      <Opt<Rules['surrender']> help="surrender" label="Surrender" value={r.surrender} options={[['late', 'Late'], ['none', 'None']]} onChange={(v) => set({ surrender: v })} />
      <Opt<Rules['blackjackPays']> help="blackjackPays" label="Blackjack pays" value={r.blackjackPays} options={[['3:2', '3:2'], ['6:5', '6:5']]} onChange={(v) => set({ blackjackPays: v })} />
      <Opt<number> help="focus" label="Weak-spot deals in Play" value={store.settings.focus} options={[[0, 'Off'], [0.25, '25%'], [0.4, '40%'], [0.6, '60%']]} onChange={(v) => mutate((s) => { s.settings.focus = v; })} />
      <Opt<DealSpeed> help="dealSpeed" label="Deal speed in Play" value={store.settings.dealSpeed} options={(['slow', 'normal', 'fast', 'casino', 'instant'] as DealSpeed[]).map((k) => [k, DEAL_SPEED_LABEL[k]] as [DealSpeed, string])} onChange={(v) => mutate((s) => { s.settings.dealSpeed = v; })} />
      <p className="muted small">4, 6 and 8 decks share one chart (Wizard of Odds 4–8 deck strategy). 6:5 blackjack doesn’t change basic strategy — it just costs you ~1.4%. Avoid 6:5 tables.</p>
      <div className="i18-head"><button className="btn wide ghost" onClick={() => mutate((s) => { s.rules = { ...DEFAULT_RULES }; })}>Restore defaults (6D H17 DAS LS 3:2)</button><HelpBubble id="restoreDefaults" /></div>
    </div>
  );
}
