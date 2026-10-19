import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const out = 'screenshots';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = async (sel, text) => {
  const ok = await page.evaluate((sel, text) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(text) && !e.disabled);
    if (el) { el.click(); return true; } return false;
  }, sel, text);
  return ok;
};

await page.goto(URL + '#learn', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
// Learn: open hard 16 vs 10
await page.evaluate(() => document.querySelector('button[aria-label="16 vs 10: Rh"]').click());
await sleep(400);
await page.screenshot({ path: `${out}/1-learn-chart.png` });

// Play: deal until there is a decision, make a deliberately wrong move once to show coaching
await page.goto(URL + '#play', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
let shot = false;
for (let i = 0; i < 40 && !shot; i++) {
  await clickText('button', 'Deal');
  await sleep(250);
  const inHand = await page.evaluate(() => !!document.querySelector('.pad'));
  if (!inHand) continue;
  // take a screenshot with action buttons visible on first live hand
  await page.screenshot({ path: `${out}/2-play-decision.png` });
  // choose Stand (may or may not be right) to trigger coach feedback
  await clickText('button', 'Stand');
  await sleep(300);
  const bad = await page.evaluate(() => !!document.querySelector('.feedback.bad'));
  if (bad) {
    await page.evaluate(() => document.querySelector('.feedback.bad')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await sleep(200);
    const open = await page.evaluate(() => !!document.querySelector('.fb-body'));
    if (!open) await page.evaluate(() => document.querySelector('.feedback')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await sleep(200);
    await page.screenshot({ path: `${out}/3-play-coach.png` });
    shot = true;
  }
}

// Drill
await page.goto(URL + '#drill', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
await clickText('button', 'Hit');
await sleep(300);
await page.screenshot({ path: `${out}/4-drill.png` });

// Stats
await page.goto(URL + '#stats', { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' });
await sleep(300);
await page.screenshot({ path: `${out}/5-stats.png` });

// Offline check: service worker should be controlling; reload while offline
const swReady = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
await page.reload({ waitUntil: 'networkidle0' });
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await sleep(800);
const offlineTitle = await page.evaluate(() => document.querySelector('.title')?.textContent);
const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).ok);
console.log(JSON.stringify({ swReady, offlineTitle, manifestFetchOffline: manifest, errors }, null, 1));
await browser.close();
