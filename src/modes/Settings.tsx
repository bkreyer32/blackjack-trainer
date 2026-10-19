import type { DeckCount, Rules } from '../engine/types';
import { DEFAULT_RULES } from '../engine/types';
import type { ModeProps } from './common';

function Opt<T extends string | number | boolean>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="opt">
      <div className="opt-label">{label}</div>
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
      <Opt<DeckCount> label="Decks" value={r.decks} options={[[1, '1'], [2, '2'], [4, '4'], [6, '6'], [8, '8']]} onChange={(v) => set({ decks: v })} />
      <Opt<boolean> label="Dealer soft 17" value={r.h17} options={[[true, 'Hits (H17)'], [false, 'Stands (S17)']]} onChange={(v) => set({ h17: v })} />
      <Opt<boolean> label="Double after split" value={r.das} options={[[true, 'Allowed'], [false, 'No']]} onChange={(v) => set({ das: v })} />
      <Opt<Rules['surrender']> label="Surrender" value={r.surrender} options={[['late', 'Late'], ['none', 'None']]} onChange={(v) => set({ surrender: v })} />
      <Opt<Rules['blackjackPays']> label="Blackjack pays" value={r.blackjackPays} options={[['3:2', '3:2'], ['6:5', '6:5']]} onChange={(v) => set({ blackjackPays: v })} />
      <Opt<number> label="Weak-spot deals in Play" value={store.settings.focus} options={[[0, 'Off'], [0.25, '25%'], [0.4, '40%'], [0.6, '60%']]} onChange={(v) => mutate((s) => { s.settings.focus = v; })} />
      <p className="muted small">4, 6 and 8 decks share one chart (Wizard of Odds 4–8 deck strategy). 6:5 blackjack doesn’t change basic strategy — it just costs you ~1.4%. Avoid 6:5 tables.</p>
      <button className="btn wide ghost" onClick={() => mutate((s) => { s.rules = { ...DEFAULT_RULES }; })}>Restore defaults (6D H17 DAS LS 3:2)</button>
    </div>
  );
}
