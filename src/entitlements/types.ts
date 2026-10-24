export interface ProductInfo { id: string; title: string; priceString: string }
export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending';

/** Abstraction over StoreKit so the rest of the app (and tests) never touch the plugin directly. */
export interface PurchaseProvider {
  readonly name: 'storekit' | 'mock';
  loadProduct(id: string): Promise<ProductInfo | null>;
  purchase(id: string): Promise<PurchaseOutcome>;
  /** Re-sync with the App Store, then report whether the product is owned. */
  restore(id: string): Promise<boolean>;
  /** Presents the App Store's offer-code redemption sheet. Ownership arrives via onChange. */
  redeemCode(): Promise<void>;
  /** true = owned, false = definitely not owned, null = could not tell (offline / unavailable). */
  owns(id: string): Promise<boolean | null>;
  /** Called when a transaction changes outside our own calls (offer code redeemed, Ask-to-Buy approved, refund). */
  onChange(cb: () => void): () => void;
}
