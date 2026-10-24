import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === text && !e.disabled); if (el) { el.click(); return true; } return false; }, text);
const tray = () => page.evaluate(() => { const t = document.querySelector('.tray'); return t && { d: +t.dataset.discarded, pct: +t.dataset.pct, level: t.dataset.level }; });
const load = async (settings) => { await page.goto(URL + '#play', { waitUntil: 'networkidle0' }); await page.evaluate((s) => localStorage.setItem('bj-trainer:v1', JSON.stringify({ settings: s })), settings); await page.reload({ waitUntil: 'networkidle0' }); };
await load({ focus: 0, dealSpeed: 'instant' });
await sleep(300);
console.log('start', await tray());
await page.screenshot({ path: 'screenshots/45-tray-start-of-shoe.png' });
// mid-hand: tray must not change until the round ends
await click('Deal'); await sleep(200);
console.log('mid-hand (dealt, not finished)', await tray());
let shots = { mid: false, near: false };
for (let i = 0; i < 400 && !shots.near; i++) {
  if (!(await click('Stand'))) { await click('Deal'); }
  await sleep(40);
  const t = await tray();
  if (!shots.mid && t.pct >= 45 && t.level === 'ok') { await sleep(700); await page.screenshot({ path: 'screenshots/46-tray-mid-shoe.png' }); shots.mid = true; console.log('mid', await tray()); }
  if (!shots.near && t.level === 'near') { await sleep(700); await page.screenshot({ path: 'screenshots/47-tray-near-cut-card.png' }); shots.near = true; console.log('near', await tray()); }
}
// run past the cut: next Deal reshuffles and empties tray
let before; for (let i = 0; i < 80; i++) { before = await tray(); if (!(await click('Stand'))) await click('Deal'); await sleep(30); const a = await tray(); if (a.d < before.d) { console.log('reshuffle: tray', before.d, '->', a.d); break; } }
// counting with decks-left shown / hidden, 1 deck
await load({ focus: 0, dealSpeed: 'instant', count: { countInPlay: true, betSizing: false, showDecksLeft: true, playQuizEvery: 50 } });
await click('Deal'); await sleep(200); await click('No insurance'); await click('Stand'); await sleep(200);
console.log('count+≈D text:', await page.evaluate(() => document.querySelector('.tray-d')?.textContent));
await page.screenshot({ path: 'screenshots/48-tray-with-decks-left.png' });
await load({ focus: 0, dealSpeed: 'instant', count: { countInPlay: true, betSizing: false, showDecksLeft: false, playQuizEvery: 50 } });
console.log('hidden ≈D:', await page.evaluate(() => document.querySelector('.tray-d')?.textContent ?? 'none'));
console.log('aria', await page.evaluate(() => document.querySelector('.tray').getAttribute('aria-label')));
await page.evaluate(() => document.querySelector('[data-help="scoreline"]').click()); await sleep(200);
await page.screenshot({ path: 'screenshots/49-tray-help.png' });
console.log('errors', errors); await browser.close();
