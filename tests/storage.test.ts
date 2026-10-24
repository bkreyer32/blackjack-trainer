import { describe, it, expect } from 'vitest';
import { createCachedStorage, type AsyncBackend, type SyncKV } from '../src/storage';

const mem = () => {
  const m = new Map<string, string>();
  const backend: AsyncBackend = { keys: async () => [...m.keys()], get: async (k) => m.get(k) ?? null, set: async (k, v) => { m.set(k, v); }, remove: async (k) => { m.delete(k); } };
  return { m, backend };
};
const legacyKV = (init: Record<string, string>): SyncKV => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), keys: () => [...m.keys()] };
};

describe('storage', () => {
  it('migrates legacy localStorage data once, only app keys', async () => {
    const { m, backend } = mem();
    const s = createCachedStorage(backend, legacyKV({ 'bj-trainer:v1': '{"a":1}', 'other-site': 'x' }));
    await s.ready;
    expect(s.getItem('bj-trainer:v1')).toBe('{"a":1}');
    expect(s.getItem('other-site')).toBeNull();
    expect(m.get('bj-trainer:v1')).toBe('{"a":1}');
    // a later launch with changed legacy data does not overwrite the migrated copy
    await s.ready;
    const s2 = createCachedStorage(backend, legacyKV({ 'bj-trainer:v1': '{"a":2}' }));
    await s2.ready;
    expect(s2.getItem('bj-trainer:v1')).toBe('{"a":1}');
  });
  it('writes through to the backend and reads back synchronously', async () => {
    const { m, backend } = mem();
    const s = createCachedStorage(backend);
    await s.ready;
    s.setItem('bj-trainer:x', '1');
    expect(s.getItem('bj-trainer:x')).toBe('1');
    await new Promise((r) => setTimeout(r, 5));
    expect(m.get('bj-trainer:x')).toBe('1');
    s.removeItem('bj-trainer:x');
    await new Promise((r) => setTimeout(r, 5));
    expect(m.has('bj-trainer:x')).toBe(false);
  });
});
