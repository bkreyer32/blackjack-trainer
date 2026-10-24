import { useCallback, useEffect, useMemo, useState } from 'react';
import { MODES } from './modes/registry';
import { loadStore, saveStore, applyMutation, type Store } from './stats/stats';
import { chartFor } from './engine/strategy';
import { rulesShort, rulesLabel } from './engine/types';
import { Sheet } from './ui/Sheet';
import { SettingsPanel } from './modes/Settings';
import { HelpBubble } from './ui/HelpBubble';
import { Guide } from './ui/Guide';
import { Welcome } from './ui/Welcome';
import { PaywallSheet } from './ui/Paywall';
import { SettingsSheet } from './ui/SettingsSheet';
import { needsWelcome, markWelcomeDone } from './storage/onboarding';
import { setHapticsEnabled, installButtonHaptics } from './platform/haptics';

function initialMode() {
  const h = location.hash.replace('#', '');
  return MODES.some((m) => m.id === h) ? h : 'learn';
}

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [mode, setMode] = useState(initialMode);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [welcome, setWelcome] = useState<null | 'first' | 'again'>(() => (needsWelcome() ? 'first' : null));
  const [guide, setGuide] = useState<{ open: boolean; page: number }>({ open: false, page: 0 });
  const openGuide = useCallback((page = 0) => setGuide({ open: true, page }), []);
  const mutate = useCallback((fn: (s: Store) => void) => {
    setStore((prev) => {
      const next = applyMutation(prev, fn);
      saveStore(next);
      return next;
    });
  }, []);
  const replaceStore = useCallback((s: Store) => { saveStore(s); setStore(s); }, []);
  useEffect(() => { history.replaceState(null, '', `#${mode}`); }, [mode]);
  useEffect(() => { setHapticsEnabled(store.settings.haptics); }, [store.settings.haptics]);
  useEffect(() => { installButtonHaptics(); }, []);
  const chart = useMemo(() => chartFor(store.rules), [store.rules]);
  const def = MODES.find((m) => m.id === mode)!;
  const Comp = def.component;
  const finishWelcome = (start?: string) => {
    markWelcomeDone();
    setWelcome(null);
    if (start && MODES.some((m) => m.id === start)) setMode(start);
  };
  return (
    <div className="app">
      <header className="top">
        <h1 className="title">{def.label}</h1>
        <div className="top-right">
          <button className="rules-chip" onClick={() => setRulesOpen(true)} aria-label={`Table rules: ${rulesLabel(store.rules)}. Tap to change.`}>
            {rulesShort(store.rules)}
          </button>
          {mode === 'play' && <HelpBubble id="rulesChip" />}
          <button className="gear" onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙︎</button>
        </div>
      </header>
      <main className="main">
        <Comp key={`${mode}-${store.rules.decks}`} store={store} mutate={mutate} chart={chart} openGuide={openGuide} />
      </main>
      <nav className="tabs" aria-label="Sections">
        {MODES.map((m) => (
          <button key={m.id} className={`tab${m.id === mode ? ' on' : ''}${m.soon ? ' soon' : ''}`} onClick={() => setMode(m.id)} aria-current={m.id === mode ? 'page' : undefined}>
            <span className="tab-icon" aria-hidden="true">{m.icon}</span>
            <span className="tab-label">{m.label}{m.soon ? ' ·soon' : ''}</span>
          </button>
        ))}
      </nav>
      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} title="Table rules">
        <SettingsPanel store={store} mutate={mutate} openGuide={openGuide} />
      </Sheet>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} store={store} mutate={mutate} replaceStore={replaceStore}
        openRules={() => setRulesOpen(true)} openWelcome={() => setWelcome('again')} openGuide={openGuide} />
      <PaywallSheet />
      <Guide key={`${guide.open}-${guide.page}`} open={guide.open} start={guide.page} onClose={() => setGuide({ open: false, page: 0 })} rules={store.rules} />
      {welcome && <Welcome store={store} mutate={mutate} firstRun={welcome === 'first'} onFinish={finishWelcome} />}
    </div>
  );
}
