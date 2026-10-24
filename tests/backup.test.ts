import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, backupFileName } from '../src/storage/backup';
import { freshStore, applyMutation, DEFAULT_SIG } from '../src/stats/stats';
import { ENT_KEY } from '../src/entitlements/controller';

describe('backup', () => {
  it('round-trips stats, settings and rules', () => {
    let s = freshStore();
    s = applyMutation(s, (st) => { st.play.hands = 12; st.settings.haptics = false; st.settings.dealSpeed = 'casino'; });
    s = applyMutation(s, (st) => { st.rules = { ...st.rules, decks: 2 }; });
    s = applyMutation(s, (st) => { st.play.hands = 4; });
    const back = parseBackup(buildBackup(s));
    expect(back.settings.haptics).toBe(false);
    expect(back.settings.dealSpeed).toBe('casino');
    expect(back.rules.decks).toBe(2);
    expect(back.play.hands).toBe(4);
    expect(back.buckets[DEFAULT_SIG].play.hands).toBe(12);
  });
  it('never contains purchase state', () => {
    const text = buildBackup(freshStore());
    expect(text).not.toContain(ENT_KEY);
    expect(text.toLowerCase()).not.toContain('entitlement');
  });
  it('rejects things that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/valid backup/);
    expect(() => parseBackup('{"a":1}')).toThrow(/isn’t a Blackjack Trainer backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'blackjack-trainer', backupVersion: 99, store: {} }))).toThrow(/newer version/);
  });
  it('accepts an old v1-style store inside a backup', () => {
    const b = parseBackup(JSON.stringify({ app: 'blackjack-trainer', backupVersion: 1, store: { version: 1, play: { cells: {}, kinds: {}, hands: 3, net: 1 } } }));
    expect(b.buckets[DEFAULT_SIG].play.hands).toBe(3);
  });
  it('file name is dated', () => expect(backupFileName(new Date('2026-10-24T12:00:00Z'))).toBe('blackjack-trainer-backup-2026-10-24.json'));
});
