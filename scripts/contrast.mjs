// WCAG contrast check for the app palette (text pairs actually used). Fails (exit 1) below AA (4.5:1 normal, 3:1 large/UI).
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const bg = '#0b0f14', panel = '#131a22', panel2 = '#1a232e';
const pairs = [
  ['muted on bg', '#8a97a6', bg], ['muted on panel', '#8a97a6', panel], ['muted on panel2', '#8a97a6', panel2],
  ['text on bg', '#e8edf2', bg], ['accent link on bg', '#3fa7ff', bg], ['accent link on panel', '#3fa7ff', panel],
  ['deal btn text on accent', '#04111f', '#3fa7ff'],
  ['white on Hit', '#ffffff', '#8f2a31'], ['white on Stand', '#ffffff', '#8c7015'], ['white on Double', '#ffffff', '#1d4f8f'], ['white on Split', '#ffffff', '#1e6b43'], ['white on Surrender', '#ffffff', '#3a434e'],
  ['zone label on felt', '#cfe5d8', '#0d3b2a'], ['danger text on bg', '#ff8b8e', bg], ['good on panel', '#2fbf71', panel], ['bad on panel', '#ec5459', panel],
  ['fb-dev gold on panel', '#ffd76a', panel],
];
let fail = 0;
for (const [n, f, b] of pairs) { const r = ratio(f, b); const ok = r >= 4.5; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}  ${n}  ${f} on ${b}`); }
process.exit(fail ? 1 : 0);
