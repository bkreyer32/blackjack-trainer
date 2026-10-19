import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const out = 'screenshots';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text, sel = 'button') => page.evaluate((sel, text) => {
  const els = [...document.querySelectorAll(sel)];
  const el = els.find((e) => e.textContent.trim() === text && !e.disabled) || els.find((e) => e.textContent.trim().startsWith(text) && !e.disabled);
  if (el) { el.click(); return true; } return false;
}, sel, text);
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const go = async (hash) => { await page.goto(URL + hash, { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); };
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });

await go('#learn');
await page.evaluate(() => {
  const k = 'bj-trainer:v1';
  const s = JSON.parse(localStorage.getItem(k) || '{}');
  s.settings = { ...(s.settings || {}), focus: 0.4, drillFilter: 'index', count: { speed: 1, flashCards: 20, flashDecks: 0, players: 3, quizEvery: 1, quizTc: true, showDecksLeft: true, tcConvention: 'truncate', tcTolerance: false, spread: '1-8', countInPlay: true, playQuizEvery: 10, deviations: true } };
  localStorage.setItem(k, JSON.stringify(s));
});
await go('#learn');
// chart with TC overlay at +4
await click('Count: off'); await sleep(150);
await page.evaluate(() => { const el = document.querySelector('.tc-bar .slider'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '4'); el.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(200);
await shot('19-learn-chart-tc-overlay');
await page.evaluate(() => document.querySelector('button[aria-label^="12 vs 2:"]').click()); await sleep(300);
await shot('20-learn-cell-index-sheet');
await click('Close'); await sleep(150);
await click('Index'); await sleep(200);
await shot('21-learn-index-list');
// Guide
await click('📘 How deviations work'); await sleep(300);
await shot('22-guide-1-why');
await click('Next ›'); await sleep(150); await click('Next ›'); await sleep(200);
await shot('23-guide-3-index-meaning');
await click('Next ›'); await sleep(200);
await shot('24-guide-4-example-16v10');
await click('✕'); await sleep(150);

// Deviation drill
await go('#drill');
await shot('25-drill-index-question');
await page.evaluate(() => { const b = [...document.querySelectorAll('.pad .btn:not(:disabled)')]; b[b.length - 1].click(); }); await sleep(250);
await shot('26-drill-index-feedback');
for (let i = 0; i < 12; i++) { await click('Next ›'); await sleep(120); await page.evaluate(() => { const b = [...document.querySelectorAll('.pad .btn:not(:disabled)')]; b[Math.floor(Math.random() * b.length)]?.click(); }); await sleep(120); }

// Play with counting + deviations: find an insurance offer and a deviation feedback
await go('#play');
let gotIns = false, gotDev = false;
for (let i = 0; i < 250 && !(gotIns && gotDev); i++) {
  if (await has('.keypad')) { await click('0', '.kp-key'); await click('Submit'); await sleep(120); if (await has('.keypad')) { await click('0', '.kp-key'); await click('Submit'); await sleep(120); } }
  if (!(await click('Next hand (bet)'))) { /* maybe mid-hand */ }
  await sleep(80);
  if (await has('.btn.bet')) { await page.evaluate(() => document.querySelectorAll('.btn.bet')[0].click()); await sleep(120); }
  if (await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent === 'Insure'))) {
    if (!gotIns) { await shot('27-play-insurance-offer'); gotIns = true; }
    await click('No insurance'); await sleep(150);
  }
  for (let k = 0; k < 6 && (await has('.pad .a-stand')); k++) {
    await click('Stand'); await sleep(120);
    if (!gotDev && (await has('.fb-dev'))) { await shot('28-play-deviation-feedback'); gotDev = true; }
  }
}
await go('#stats');
await page.evaluate(() => { const h = [...document.querySelectorAll('h3')].find((x) => x.textContent.startsWith('Deviations')); h.scrollIntoView(); }); await sleep(200);
await shot('29-stats-deviations');
console.log(JSON.stringify({ gotIns, gotDev, errors }));
await browser.close();
