import type { ProductInfo, PurchaseProvider } from './types';
import type { SyncKV } from '../storage';

export const ENT_KEY = 'bj-trainer:entitlement';

export interface EntState {
  pro: boolean;
  /** when ownership was last confirmed with the App Store (ms), or null if never */
  verifiedAt: number | null;
  product: ProductInfo | null;
  busy: boolean;
  message: string | null;
  paywallOpen: boolean;
  paywallReason: string | null;
}

/** Decide the entitlement from the cached value and a fresh ownership check. Offline/unknown keeps the cache. */
export function reconcile(cachedPro: boolean, owns: boolean | null): boolean {
  return owns === null ? cachedPro : owns;
}

export class EntitlementController {
  state: EntState;
  private listeners = new Set<() => void>();
  constructor(private provider: PurchaseProvider | null, private kv: SyncKV, private productId: string, readonly gated: boolean, private now: () => number = Date.now) {
    let cached = { pro: false, verifiedAt: null as number | null };
    try { const raw = kv.getItem(ENT_KEY); if (raw) cached = { ...cached, ...JSON.parse(raw) }; } catch { /* ignore */ }
    this.state = { pro: cached.pro === true, verifiedAt: cached.verifiedAt, product: null, busy: false, message: null, paywallOpen: false, paywallReason: null };
    provider?.onChange(() => { void this.refresh(); });
  }
  /** The one question the rest of the app asks. The web build is never gated. */
  hasPro = (): boolean => !this.gated || this.state.pro;
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getSnapshot = () => this.state;
  private set(patch: Partial<EntState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  private persist() {
    this.kv.setItem(ENT_KEY, JSON.stringify({ pro: this.state.pro, verifiedAt: this.state.verifiedAt }));
  }
  private apply(owns: boolean | null) {
    const pro = reconcile(this.state.pro, owns);
    this.set({ pro, verifiedAt: owns === null ? this.state.verifiedAt : this.now(), paywallOpen: pro ? false : this.state.paywallOpen });
    this.persist();
  }

  /** Launch: show the cached entitlement immediately, then re-verify with the App Store. */
  async init(): Promise<void> {
    if (!this.gated || !this.provider) return;
    try { this.set({ product: await this.provider.loadProduct(this.productId) }); } catch { /* price unavailable offline */ }
    await this.refresh();
  }
  async refresh(): Promise<void> {
    if (!this.gated || !this.provider) return;
    let owns: boolean | null = null;
    try { owns = await this.provider.owns(this.productId); } catch { owns = null; }
    this.apply(owns);
  }
  async buy(): Promise<void> {
    if (!this.provider || this.state.busy) return;
    this.set({ busy: true, message: null });
    try {
      const r = await this.provider.purchase(this.productId);
      if (r === 'purchased') { this.apply(true); this.set({ message: 'Unlocked. Thank you!' }); }
      else if (r === 'pending') this.set({ message: 'Purchase is pending approval. It will unlock automatically once approved.' });
      else this.set({ message: null });
    } catch (e) {
      this.set({ message: friendlyError(e) });
    } finally { this.set({ busy: false }); }
  }
  async restore(): Promise<void> {
    if (!this.provider || this.state.busy) return;
    this.set({ busy: true, message: null });
    try {
      const owned = await this.provider.restore(this.productId);
      this.apply(owned);
      this.set({ message: owned ? 'Purchase restored.' : 'No previous purchase was found for this Apple ID.' });
    } catch (e) {
      this.set({ message: friendlyError(e) });
    } finally { this.set({ busy: false }); }
  }
  async redeem(): Promise<void> {
    if (!this.provider || this.state.busy) return;
    this.set({ busy: true, message: null });
    try { await this.provider.redeemCode(); await this.refresh(); }
    catch (e) { this.set({ message: friendlyError(e) }); }
    finally { this.set({ busy: false }); }
  }
  openPaywall(reason: string | null = null) { if (this.gated && !this.state.pro) this.set({ paywallOpen: true, paywallReason: reason, message: null }); }
  closePaywall() { this.set({ paywallOpen: false }); }
}

export function friendlyError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/cancel/i.test(m)) return '';
  if (/offline|network|internet|connect/i.test(m)) return 'Can’t reach the App Store right now. Check your connection and try again. Your existing unlock still works offline.';
  return 'Something went wrong with the App Store. Please try again.';
}
