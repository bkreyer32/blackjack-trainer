import type { ProductInfo, PurchaseOutcome, PurchaseProvider } from '../types';
import type { SyncKV } from '../../storage';

export const MOCK_OWNED_KEY = 'bj-trainer:mock-owned';
export const MOCK_OPTS_KEY = 'bj-trainer:mock-opts';
export interface MockOpts { offline: boolean; failNextPurchase: boolean; pendingNextPurchase: boolean }
export const defaultMockOpts = (): MockOpts => ({ offline: false, failNextPurchase: false, pendingNextPurchase: false });

/** Dev/web stand-in for StoreKit. Ownership lives in storage; the dev panel flips the options. */
export class MockProvider implements PurchaseProvider {
  readonly name = 'mock' as const;
  private cbs = new Set<() => void>();
  constructor(private kv: SyncKV, private delay = 250) {}
  opts(): MockOpts { try { return { ...defaultMockOpts(), ...JSON.parse(this.kv.getItem(MOCK_OPTS_KEY) ?? '{}') }; } catch { return defaultMockOpts(); } }
  setOpts(p: Partial<MockOpts>) { this.kv.setItem(MOCK_OPTS_KEY, JSON.stringify({ ...this.opts(), ...p })); }
  private owned() { return this.kv.getItem(MOCK_OWNED_KEY) === '1'; }
  setOwned(v: boolean) { if (v) this.kv.setItem(MOCK_OWNED_KEY, '1'); else this.kv.removeItem(MOCK_OWNED_KEY); this.cbs.forEach((c) => c()); }
  private wait = () => new Promise<void>((r) => setTimeout(r, this.delay));
  async loadProduct(id: string): Promise<ProductInfo | null> {
    if (this.opts().offline) return null;
    return { id, title: 'Unlock Counting & Deviations', priceString: '$4.99' };
  }
  async purchase(_id: string): Promise<PurchaseOutcome> {
    await this.wait();
    const o = this.opts();
    if (o.offline) throw new Error('offline');
    if (o.failNextPurchase) { this.setOpts({ failNextPurchase: false }); throw new Error('store error'); }
    if (o.pendingNextPurchase) { this.setOpts({ pendingNextPurchase: false }); return 'pending'; }
    this.kv.setItem(MOCK_OWNED_KEY, '1');
    return 'purchased';
  }
  async restore(_id: string): Promise<boolean> {
    await this.wait();
    if (this.opts().offline) throw new Error('offline');
    return this.owned();
  }
  async redeemCode(): Promise<void> {
    await this.wait();
    if (this.opts().offline) throw new Error('offline');
    // Simulates the system sheet: a successful redemption arrives as a transaction update.
    setTimeout(() => this.setOwned(true), 150);
  }
  async owns(_id: string): Promise<boolean | null> {
    if (this.opts().offline) return null;
    return this.owned();
  }
  onChange(cb: () => void) { this.cbs.add(cb); return () => { this.cbs.delete(cb); }; }
}
