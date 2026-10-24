import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initStorage } from './storage';
import { entitlements } from './entitlements';
import './styles.css';

/** Honour iOS Dynamic Type (root font follows the system text size) but stop short of layout-breaking sizes. */
function capDynamicType() {
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  if (px > 23) document.documentElement.style.fontSize = '23px';
}

async function boot() {
  await initStorage(); // native: load Preferences into memory (and migrate old localStorage data once)
  const ent = entitlements();
  void ent.init();     // cached entitlement is available immediately; re-verified in the background
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  capDynamicType();
}
void boot();
