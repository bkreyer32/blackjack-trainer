import { useCallback, useEffect, useMemo, useState } from 'react';
import { MODES } from './modes/registry';
import { loadStore, saveStore, type Store } from './stats/stats';
import { chartFor } from './engine/strategy';
import { rulesLabel } from './engine/types';
import { Sheet } from './ui/Sheet';
import { SettingsPanel } from './modes/Settings';
import { Guide } from './ui/Guide';

function initialMode() {
  const h = location.hash.replace('#', '');
  return MODES.some((m) => m.id === h) ? h : 'learn';
}

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [mode, setMode] = useState(initialMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guide, setGuide] = useState<{ open: boolean; page: number }>({ open: false, page: 0 });
  const openGuide = useCallback((page = 0) => setGuide({ open: true, page }), []);
  const mutate = useCallback((fn: (s: Store) => void) => {
    setStore((prev) => {
      const next = structuredClone(prev);
      fn(next);
      saveStore(next);
      return next;
    });
  }, []);
  useEffect(() => { history.replaceState(null, '', `#${mode}`); }, [mode]);
  const chart = useMemo(() => chartFor(store.rules), [store.rules]);
  const def = MODES.find((m) => m.id === mode)!;
  const Comp = def.component;
  return (
    <div className="app">
      <header className="top">
        <div className="title">{def.label}</div>
        <button className="rules-chip" onClick={() => setSettingsOpen(true)} aria-label="Rules and settings">
          {rulesLabel(store.rules)} ⚙︎
        </button>
      </header>
      <main className="main">
        <Comp key={`${mode}-${store.rules.decks}`} store={store} mutate={mutate} chart={chart} openGuide={openGuide} />
      </main>
      <nav className="tabs">
        {MODES.map((m) => (
          <button key={m.id} className={`tab${m.id === mode ? ' on' : ''}${m.soon ? ' soon' : ''}`} onClick={() => setMode(m.id)}>
            <span className="tab-icon">{m.icon}</span>
            <span className="tab-label">{m.label}{m.soon ? ' ·soon' : ''}</span>
          </button>
        ))}
      </nav>
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Table rules">
        <SettingsPanel store={store} mutate={mutate} openGuide={openGuide} />
      </Sheet>
      <Guide key={`${guide.open}-${guide.page}`} open={guide.open} start={guide.page} onClose={() => setGuide({ open: false, page: 0 })} rules={store.rules} />
    </div>
  );
}
