import { describe, it, expect } from 'vitest';
import { haptic, setHapticsEnabled, hapticsEnabled, hapticResult } from '../src/platform/haptics';

describe('haptics', () => {
  it('is a safe no-op on the web (no native bridge)', () => {
    expect(() => { haptic('tap'); haptic('success'); haptic('error'); hapticResult(true); }).not.toThrow();
  });
  it('can be switched off from Settings', () => {
    setHapticsEnabled(false); expect(hapticsEnabled()).toBe(false);
    setHapticsEnabled(true); expect(hapticsEnabled()).toBe(true);
  });
});
