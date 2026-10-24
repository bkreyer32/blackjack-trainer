import { useSyncExternalStore } from 'react';
import app from '../../app.config.json';
import { NATIVE_BUILD, onDevice } from '../platform/native';
import { storage } from '../storage';
import { EntitlementController, type EntState } from './controller';
import { MockProvider } from './providers/mock';
import { StoreKitProvider } from './providers/storekit';
import type { PurchaseProvider } from './types';

export type { Feature } from './gating';
export const PRODUCT_ID: string = app.iapProductId;

let mock: MockProvider | null = null;
export const mockProvider = () => mock;

function makeProvider(): PurchaseProvider | null {
  if (!NATIVE_BUILD) return null;           // public web build: nothing is sold, nothing is locked
  if (onDevice()) return new StoreKitProvider();
  mock = new MockProvider(storage);          // native-flag build in a browser (dev, CI, headless tests)
  return mock;
}

let ctl: EntitlementController | null = null;
/** Created lazily so storage has been initialised (initStorage) first. */
export function entitlements(): EntitlementController {
  return (ctl ??= new EntitlementController(makeProvider(), storage, PRODUCT_ID, NATIVE_BUILD));
}
/** Is the user entitled to paid features? Always true on the web build. */
export const hasPro = (): boolean => entitlements().hasPro();
export const openPaywall = (reason?: string) => entitlements().openPaywall(reason ?? null);

export function useEntitlement(): EntState & { pro: boolean; gated: boolean } {
  const c = entitlements();
  const st = useSyncExternalStore(c.subscribe, c.getSnapshot);
  return { ...st, pro: !c.gated || st.pro, gated: c.gated };
}
