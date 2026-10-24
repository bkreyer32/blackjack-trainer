import { useRef, useState } from 'react';
import app from '../../app.config.json';
import pkg from '../../package.json';
import { NATIVE_BUILD, DEV_TOOLS } from '../platform/native';
import { entitlements, mockProvider, useEntitlement } from '../entitlements';
import { exportBackup, parseBackup } from '../storage/backup';
import type { Store } from '../stats/stats';
import { Sheet } from './Sheet';
import { HelpBubble } from './HelpBubble';
import { Lock } from './Paywall';
import { DISCLAIMER } from './about-text';

interface Props {
  open: boolean;
  onClose: () => void;
  store: Store;
  mutate: (fn: (s: Store) => void) => void;
  replaceStore: (s: Store) => void;
  openRules: () => void;
  openWelcome: () => void;
  openGuide: (page?: number) => void;
}

export function AboutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="About">
      <p><b>{app.appName}</b> · version {pkg.version}</p>
      <ul className="g-list">{DISCLAIMER.map((t) => <li key={t}>{t}</li>)}</ul>
      <p>Everything stays on your device. No accounts, no ads, no tracking.</p>
      <p className="pw-links">
        <a href={app.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a> · <a href={app.supportUrl} target="_blank" rel="noreferrer">Support</a>
      </p>
      <p className="muted small">Contact: {app.supportEmail}</p>
    </Sheet>
  );
}

export function SettingsSheet({ open, onClose, store, mutate, replaceStore, openRules, openWelcome, openGuide }: Props) {
  const e = useEntitlement();
  const c = entitlements();
  const [about, setAbout] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const mock = mockProvider();

  const doExport = async () => {
    try { const r = await exportBackup(store); setMsg(r === 'downloaded' ? 'Backup downloaded.' : null); } catch { setMsg('Couldn’t create the backup.'); }
  };
  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const next = parseBackup(await f.text());
      if (!confirm('Replace the stats and settings on this device with this backup?')) return;
      replaceStore(next);
      setMsg('Backup restored.');
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Couldn’t read that file.'); }
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Settings">
        <h3 className="set-h">Table</h3>
        <button className="set-row" onClick={() => { onClose(); openRules(); }}><span>Table rules</span><span className="muted">Decks, H17/S17, surrender… ›</span></button>

        <h3 className="set-h">Feedback</h3>
        <div className="opt">
          <div className="opt-label with-help">Haptics<HelpBubble id="haptics" label="Haptics" /></div>
          <div className="seg small">
            {([[true, 'On'], [false, 'Off']] as [boolean, string][]).map(([v, l]) => (
              <button key={l} className={store.settings.haptics === v ? 'on' : ''} aria-pressed={store.settings.haptics === v} onClick={() => mutate((s) => { s.settings.haptics = v; })}>{l}</button>
            ))}
          </div>
        </div>

        {e.gated && (<>
          <h3 className="set-h">Unlock</h3>
          <div className="set-status">{e.pro ? '✓ Counting & Deviations unlocked' : <><Lock /> Counting & Deviations locked</>}</div>
          {!e.pro && <button className="btn deal" onClick={() => { onClose(); c.openPaywall(); }}>Unlock{e.product ? ` · ${e.product.priceString}` : ''}</button>}
          <div className="pw-row">
            <button className="btn ghost" disabled={e.busy} onClick={() => void c.restore()}>Restore Purchases</button>
            <button className="btn ghost" disabled={e.busy} onClick={() => void c.redeem()}>Redeem Code</button>
          </div>
          {e.message && <p className="pw-msg" role="status">{e.message}</p>}
        </>)}

        <h3 className="set-h">Your data</h3>
        <p className="muted small">Stats and settings live on this device only. Back them up to a file you can keep or move to another device.</p>
        <div className="pw-row">
          <button className="btn ghost" onClick={() => void doExport()}>Export backup</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>Import backup</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(ev) => void doImport(ev.target.files?.[0])} aria-label="Choose backup file" />
        {msg && <p className="pw-msg" role="status">{msg}</p>}

        <h3 className="set-h">Help</h3>
        <button className="set-row" onClick={() => { onClose(); openWelcome(); }}><span>Show the welcome tour again</span><span className="muted">›</span></button>
        <button className="set-row" onClick={() => { onClose(); openGuide(0); }}><span>How deviations work</span><span className="muted">›</span></button>

        <h3 className="set-h">About</h3>
        <button className="set-row" onClick={() => setAbout(true)}><span>About &amp; disclaimer</span><span className="muted">v{pkg.version} ›</span></button>
        <a className="set-row" href={app.privacyUrl} target="_blank" rel="noreferrer"><span>Privacy Policy</span><span className="muted">›</span></a>
        <a className="set-row" href={app.supportUrl} target="_blank" rel="noreferrer"><span>Support</span><span className="muted">›</span></a>

        {DEV_TOOLS && NATIVE_BUILD && mock && (<>
          <h3 className="set-h">Developer (mock purchases)</h3>
          <div className="dev-tools">
            <button className="btn ghost" onClick={() => { mock.setOwned(true); }}>Grant Pro</button>
            <button className="btn ghost" onClick={() => { mock.setOwned(false); }}>Revoke Pro</button>
            <button className="btn ghost" onClick={() => { mock.setOpts({ offline: !mock.opts().offline }); setMsg(`Offline: ${mock.opts().offline}`); }}>Toggle offline</button>
            <button className="btn ghost" onClick={() => { mock.setOpts({ failNextPurchase: true }); setMsg('Next purchase will fail'); }}>Fail next buy</button>
          </div>
        </>)}
      </Sheet>
      <AboutSheet open={about} onClose={() => setAbout(false)} />
    </>
  );
}
