import app from '../../app.config.json';
import { entitlements, useEntitlement } from '../entitlements';
import { FEATURE_COPY, FREE_INCLUDES, PRO_INCLUDES, type Feature } from '../entitlements/gating';
import { Sheet } from './Sheet';

/** The one-time "Unlock Counting & Deviations" purchase sheet. Only ever opened in the native build. */
export function PaywallSheet() {
  const e = useEntitlement();
  const c = entitlements();
  if (!e.gated) return null;
  const reason = e.paywallReason && e.paywallReason in FEATURE_COPY ? FEATURE_COPY[e.paywallReason as Feature] : null;
  const price = e.product?.priceString;
  return (
    <Sheet open={e.paywallOpen} onClose={() => c.closePaywall()} title={app.iapDisplayName}>
      {reason && <p className="pw-reason"><b>{reason.title}</b> is part of the unlock. {reason.blurb}</p>}
      <p className="muted">One purchase, yours forever on this Apple ID. No subscription, no ads.</p>
      <h3 className="pw-h">Included</h3>
      <ul className="pw-list pro">{PRO_INCLUDES.map((t) => <li key={t}>{t}</li>)}</ul>
      <h3 className="pw-h">Always free</h3>
      <ul className="pw-list">{FREE_INCLUDES.map((t) => <li key={t}>{t}</li>)}</ul>
      <button className="btn deal pw-buy" disabled={e.busy} onClick={() => void c.buy()}>
        {e.busy ? 'Working…' : price ? `Unlock for ${price}` : 'Unlock'}
      </button>
      {!price && <p className="muted small center">Price unavailable right now. Check your connection.</p>}
      <div className="pw-row">
        <button className="btn ghost" disabled={e.busy} onClick={() => void c.restore()}>Restore Purchases</button>
        <button className="btn ghost" disabled={e.busy} onClick={() => void c.redeem()}>Redeem Code</button>
      </div>
      {e.message && <p className="pw-msg" role="status">{e.message}</p>}
      <p className="pw-links small">
        <a href={app.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a> · <a href={app.termsUrl} target="_blank" rel="noreferrer">Terms of Use</a> · <a href={app.supportUrl} target="_blank" rel="noreferrer">Support</a>
      </p>
    </Sheet>
  );
}

/** Small lock marker for labels. */
export const Lock = ({ show = true }: { show?: boolean }) => (show ? <span className="lock" aria-label="locked" role="img">🔒</span> : null);
