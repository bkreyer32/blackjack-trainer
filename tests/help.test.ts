import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HELP, PLAY_SETTING_HELP, PLAY_CONTROL_HELP } from '../src/ui/help';

const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const fnBody = (code: string, name: string) => {
  const i = code.indexOf(`function ${name}(`);
  expect(i, name).toBeGreaterThan(-1);
  const j = code.indexOf('\nfunction ', i + 1);
  return code.slice(i, j === -1 ? undefined : j);
};
const helpIds = (code: string) => [...code.matchAll(/help="(\w+)"|<HelpBubble id="(\w+)"/g)].map((m) => m[1] ?? m[2]);

describe('Play-tab help coverage', () => {
  it('every help entry has a title and a real explanation', () => {
    for (const [id, h] of Object.entries(HELP)) {
      expect(h.title.length, id).toBeGreaterThan(2);
      expect(h.body.length, id).toBeGreaterThan(40);
    }
  });

  it('every rules-sheet setting (⚙︎ chip) has a help bubble', () => {
    const code = src('modes/Settings.tsx');
    const opts = code.match(/<Opt</g) ?? [];
    const withHelp = code.match(/<Opt<[^>]*>\s+help="\w+"/g) ?? [];
    expect(opts.length).toBeGreaterThanOrEqual(6);
    expect(withHelp.length).toBe(opts.length);
    expect(code).toContain('<HelpBubble id="restoreDefaults"');
  });

  it('every Count → In Play setting has a help bubble', () => {
    const code = src('modes/Count.tsx');
    const body = fnBody(code, 'InPlay') + fnBody(code, 'TcOptions');
    const segs = body.match(/<Seg[<\s]/g) ?? [];
    const withHelp = body.match(/<Seg(<[^>]*>)?\s+help="\w+"/g) ?? [];
    expect(segs.length).toBe(7);
    expect(withHelp.length).toBe(segs.length);
  });

  it('help ids used in the UI all exist, and cover the declared settings and controls', () => {
    const used = new Set([...helpIds(src('modes/Settings.tsx')), ...helpIds(src('modes/Count.tsx')), ...helpIds(src('modes/Play.tsx')), ...helpIds(src('App.tsx'))]);
    for (const id of used) expect(HELP, id).toHaveProperty(id);
    for (const id of [...PLAY_SETTING_HELP, ...PLAY_CONTROL_HELP]) expect(used.has(id), id).toBe(true);
  });
});
