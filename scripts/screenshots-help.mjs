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
const go = async (hash) => { await page.goto(URL + hash, { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); };
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const q = (id) => page.evaluate((id) => { const b = document.querySelector(`[data-help="${id}"]`); if (b) b.click(); return !!b; }, id);
const tapOutside = () => page.evaluate(() => document.querySelector('.help-backdrop')?.click());
const popOpen = () => page.evaluate(() => !!document.querySelector('.help-pop'));

await go('#learn');
await page.evaluate(() => { localStorage.removeItem('bj-trainer:v1'); });
await go('#learn');
await click('Index'); await sleep(200);
await shot('30-learn-index-i18-header');
await click('What are the Illustrious 18'); await sleep(300);
await shot('31-guide-i18-fab4-page');
await click('✕'); await sleep(150);

// Play tab (counting off): help on Deal + rules chip + scoreline
await go('#play');
const sizes = await page.evaluate(() => [...document.querySelectorAll('.help-q')].map((b) => { const r = b.getBoundingClientRect(); return [b.dataset.help, Math.round(r.width), Math.round(r.height)]; }));
console.log('play bubbles', JSON.stringify(sizes));
await shot('32-play-help-bubbles');
await q('deal'); await sleep(200);
await shot('33-play-help-open-deal');
await page.mouse.click(195, 120); await sleep(200);
console.log('dismissed by outside tap:', !(await popOpen()));
// rules sheet with bubbles, one open
await click('6D', '.rules-chip') || await page.evaluate(() => document.querySelector('.rules-chip').click()); await sleep(250);
await shot('34-rules-sheet-help-bubbles');
await q('h17'); await sleep(200);
await shot('35-rules-sheet-help-open-h17');
await tapOutside(); await sleep(150);
console.log('sheet still open after help dismiss:', await page.evaluate(() => !!document.querySelector('.sheet')));
await click('Close'); await sleep(150);
// Count → In Play settings
await go('#count');
await click('In Play'); await sleep(200);
await q('deviations'); await sleep(200);
await shot('36-count-inplay-help-open-deviations');
await tapOutside(); await sleep(150);
const ids = await page.evaluate(() => [...document.querySelectorAll('.help-q')].map((b) => b.dataset.help));
console.log('in-play bubbles', ids.join(','));
// Play counting on: bet help
await click('On'); await sleep(100);
await go('#play');
await click('Next hand (bet)'); await sleep(250);
await q('bet'); await sleep(200);
await shot('37-play-help-open-bet');
console.log('errors', errors);
await browser.close();
