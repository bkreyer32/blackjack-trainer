import { Preferences } from '@capacitor/preferences';
import { onDevice } from '../platform/native';

/**
 * Persistence for everything the app saves.
 * - Native (Capacitor): @capacitor/preferences (UserDefaults; not evicted like WKWebView localStorage), read into an
 *   in-memory cache at startup so the rest of the app stays synchronous.
 * - Web: plain localStorage.
 * One-time migration: on first native launch, existing localStorage data (PWA/web saves) is copied into Preferences.
 */
export interface AsyncBackend {
  keys(): Promise<string[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface SyncKV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}
export const PREFIX = 'bj-trainer:';
const MIGRATED = `${PREFIX}migrated-from-localstorage`;

export interface Storage extends SyncKV { ready: Promise<void> }

/** Cache-backed storage over an async backend, with one-time migration from a legacy synchronous store. */
export function createCachedStorage(backend: AsyncBackend, legacy?: SyncKV): Storage {
  const cache = new Map<string, string>();
  let chain: Promise<unknown> = Promise.resolve();
  const queue = (fn: () => Promise<void>) => { chain = chain.then(fn).catch(() => undefined); };
  const ready = (async () => {
    for (const k of await backend.keys()) {
      const v = await backend.get(k);
      if (v !== null) cache.set(k, v);
    }
    if (legacy && !cache.has(MIGRATED)) {
      for (const k of legacy.keys()) {
        if (k.startsWith(PREFIX) && !cache.has(k)) {
          const v = legacy.getItem(k);
          if (v !== null) { cache.set(k, v); await backend.set(k, v); }
        }
      }
      cache.set(MIGRATED, '1');
      await backend.set(MIGRATED, '1');
    }
  })();
  return {
    ready,
    getItem: (k) => cache.get(k) ?? null,
    setItem: (k, v) => { cache.set(k, v); queue(() => backend.set(k, v)); },
    removeItem: (k) => { cache.delete(k); queue(() => backend.remove(k)); },
    keys: () => [...cache.keys()],
  };
}

const localKV = (): SyncKV => ({
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* full / private mode */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  keys: () => { try { return Object.keys(localStorage); } catch { return []; } },
});

const prefsBackend: AsyncBackend = {
  keys: async () => (await Preferences.keys()).keys,
  get: async (key) => (await Preferences.get({ key })).value,
  set: async (key, value) => { await Preferences.set({ key, value }); },
  remove: async (key) => { await Preferences.remove({ key }); },
};

let impl: Storage = { ...localKV(), ready: Promise.resolve() };

/** Call once before rendering. */
export async function initStorage(): Promise<void> {
  if (onDevice()) {
    impl = createCachedStorage(prefsBackend, localKV());
    await impl.ready;
  }
}

export const storage: SyncKV = {
  getItem: (k) => impl.getItem(k),
  setItem: (k, v) => impl.setItem(k, v),
  removeItem: (k) => impl.removeItem(k),
  keys: () => impl.keys(),
};
