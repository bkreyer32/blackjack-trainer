import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (text, sel = 'button') => page.evaluate((sel, text) => {
  const els = [...document.querySelectorAll(sel)];
  const el = els.find((e) => e.textContent.trim() === text && !e.disabled) || els.find((e) => e.textContent.trim().startsWith(text) && !e.disabled);
  if (el) { el.click(); return true; } return false; }, sel, text);
const go = async (hash) => { await page.goto(URL + hash, { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); };
const shot = (n) => page.screenshot({ path: `screenshots/${n}.png` });
await go('#count'); await page.evaluate(() => localStorage.removeItem('bj-trainer:v1')); await go('#count');
await click('In Play'); await sleep(200);
await click('On'); await sleep(150);
await shot('39-count-inplay-bet-sizing-on');
await click('Off — flat 1 unit'); await sleep(150);
await shot('40-count-inplay-bet-sizing-off');
await page.evaluate(() => document.querySelector('[data-help="betSizing"]').click()); await sleep(200);
await shot('41-count-inplay-bet-sizing-help');
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bj-trainer:v1')).settings.count);
console.log('persisted betSizing', saved.betSizing, 'countInPlay', saved.countInPlay, 'spread control visible', await page.evaluate(() => !!document.querySelector('[data-help="spread"]')));
await go('#play');
const r = [];
for (let i = 0; i < 12; i++) {
  if (await page.$('.keypad')) { await click('0', '.kp-key'); await click('Submit'); await sleep(100); if (await page.$('.keypad')) { await click('0', '.kp-key'); await click('Submit'); await sleep(100); } r.push('quiz'); }
  if (await click('Deal')) { await sleep(120); }
  r.push(await page.evaluate(() => document.querySelector('.bet-label')?.textContent.includes('Your bet') ? 'BETPICKER' : 'nobet'));
  for (let k = 0; k < 6 && await click('Stand'); k++) await sleep(80);
}
console.log(r.join(' '), 'betStats', await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('bj-trainer:v1')).count.play.bet)));
console.log('errors', errors); await browser.close();
