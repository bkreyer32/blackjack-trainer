import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import type { ProductInfo, PurchaseOutcome, PurchaseProvider } from '../types';

/** StoreKit 2 via @capgo/native-purchases. Non-consumable ("inapp") product. Only constructed inside the real iOS app. */
export class StoreKitProvider implements PurchaseProvider {
  readonly name = 'storekit' as const;
  private cbs = new Set<() => void>();
  private listening = false;
  private listen() {
    if (this.listening) return;
    this.listening = true;
    void NativePurchases.addListener('transactionUpdated', () => this.cbs.forEach((c) => c()));
  }
  async loadProduct(id: string): Promise<ProductInfo | null> {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: [id], productType: PURCHASE_TYPE.INAPP });
    const p = products[0];
    return p ? { id, title: p.title, priceString: p.priceString } : null;
  }
  async purchase(id: string): Promise<PurchaseOutcome> {
    try {
      await NativePurchases.purchaseProduct({ productIdentifier: id, productType: PURCHASE_TYPE.INAPP, quantity: 1 });
      return 'purchased';
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(m)) return 'cancelled';
      if (/pending/i.test(m)) return 'pending';
      throw e;
    }
  }
  async restore(id: string): Promise<boolean> {
    await NativePurchases.restorePurchases(); // syncs with the App Store (may ask for the Apple ID password)
    return (await this.owns(id)) === true;
  }
  async redeemCode(): Promise<void> {
    await NativePurchases.presentOfferCodeRedeemSheet(); // iOS 16+; the result arrives as a transactionUpdated event
  }
  async owns(id: string): Promise<boolean | null> {
    try {
      const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP, onlyCurrentEntitlements: true });
      return purchases.some((t) => t.productIdentifier === id);
    } catch {
      return null; // can't tell (offline / StoreKit unavailable): keep the cached entitlement
    }
  }
  onChange(cb: () => void) { this.listen(); this.cbs.add(cb); return () => { this.cbs.delete(cb); }; }
}
