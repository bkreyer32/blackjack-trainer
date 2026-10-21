import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text) => page.evaluate((text) => { const el = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === text && !e.disabled); if (el) { el.click(); return true; } return false; }, text);
const state = () => page.evaluate(() => ({
  dealer: [...document.querySelectorAll('.card-row.dealer .card')].map((c) => c.getAttribute('aria-label')).join(' '),
  you: [...document.querySelectorAll('.hands .card')].map((c) => c.getAttribute('aria-label')).join(' '),
  dealing: !!document.querySelector('.table.dealing'),
  enabledActs: [...document.querySelectorAll('.actions button:not(:disabled)')].map((b) => b.textContent.trim()).join(','),
  quiz: !!document.querySelector('.keypad'),
}));
await page.goto(URL + '#play', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.setItem('bj-trainer:v1', JSON.stringify({ settings: { focus: 0, dealSpeed: 'slow', count: { countInPlay: true, betSizing: false, playQuizEvery: 1, deviations: true } } })));
await page.reload({ waitUntil: 'networkidle0' });
// Fresh deal, sampled every 300 ms (slow = 900 ms per card)
await click('Deal');
const seen = [];
let shotDone = false;
for (let t = 0; t < 14; t++) {
  const s = await state(); seen.push(JSON.stringify(s));
  if (!shotDone && s.dealing && s.you.split(' ').length === 2 && s.dealer.split(' ').length === 1) { await page.screenshot({ path: 'screenshots/42-play-mid-deal.png' }); shotDone = true; }
  await sleep(300);
}
console.log(seen.join('\n'));
// Stand and watch the dealer reveal; check no quiz mid-animation, then Deal → quiz only after
if (await click('No insurance')) await sleep(3000);
await click('Stand');
const dl = [];
let shot2 = false;
for (let t = 0; t < 20; t++) { const s = await state(); dl.push(`${s.dealer} | dealing=${s.dealing} quiz=${s.quiz} acts=${s.enabledActs}`);
  if (!shot2 && s.dealing && !s.dealer.includes('face-down')) { await page.screenshot({ path: 'screenshots/43-play-dealer-reveal.png' }); shot2 = true; }
  await sleep(300); }
console.log(dl.join('\n'));
await click('Deal'); await sleep(200);
console.log('after Deal: quiz shown =', (await state()).quiz);
// Settings sheet with Deal speed
await page.evaluate(() => document.querySelector('.rules-chip').click()); await sleep(300);
await page.evaluate(() => document.querySelector('.sheet').scrollTo(0, 9999)); await sleep(150);
await page.screenshot({ path: 'screenshots/44-rules-sheet-deal-speed.png' });
// reduced motion check
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.reload({ waitUntil: 'networkidle0' });
console.log('reduced-motion anim:', await page.evaluate(() => { const d = document.createElement('div'); d.className = 'card'; document.querySelector('.table').appendChild(d); return getComputedStyle(d).animationName; }));
console.log('errors', errors); await browser.close();
