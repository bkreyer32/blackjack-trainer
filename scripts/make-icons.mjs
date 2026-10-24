// Renders every icon/splash from SVG using headless Chrome, then flattens to opaque RGB PNGs (App Store rejects alpha).
// Usage: node scripts/make-icons.mjs   (needs /usr/bin/google-chrome and python3 + Pillow)
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { iconSvg, splashSvg } from './icon-art.mjs';

const OUT = 'build-assets';
mkdirSync(OUT, { recursive: true });
const jobs = [
  ['icon-1024', iconSvg(1024), 1024],
  ['icon-512', iconSvg(512), 512],
  ['icon-192', iconSvg(192), 192],
  ['icon-512-maskable', iconSvg(512, 0.78), 512],
  ['apple-touch-icon', iconSvg(180), 180],
  ['favicon', iconSvg(64), 64],
  ['splash-2732', splashSvg(2732), 2732],
];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const [name, svg, size] of jobs) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#062619">${svg}</body></html>`);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(`${OUT}/${name}.svg`, svg);
}
await browser.close();
execFileSync('python3', ['scripts/place-icons.py'], { stdio: 'inherit' });
