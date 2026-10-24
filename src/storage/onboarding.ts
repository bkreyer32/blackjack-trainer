import { storage } from './index';
const KEY = 'bj-trainer:onboarding';
/** The welcome flow (which includes the disclaimer acknowledgement) is shown once. */
export const needsWelcome = (): boolean => { try { return !JSON.parse(storage.getItem(KEY) ?? '{}').done; } catch { return true; } };
export const markWelcomeDone = () => storage.setItem(KEY, JSON.stringify({ done: true, disclaimer: 1, at: Date.now() }));
