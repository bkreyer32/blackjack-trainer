import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const NATIVE = process.argv[3] || 'http://localhost:4180/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = async (w = 390, h = 844) => { const p = await browser.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); p.on('pageerror', (e) => console.log('PAGEERROR', String(e))); return p; };
const click = (page, text) => page.evaluate((text) => { const el = [...document.querySelectorAll('button')].find((e) => e.textContent.replace('🔒', '').trim() === text && !e.disabled); if (el) { el.click(); return true; } return false; }, text);
const load = async (p, url, hash, seed) => { await p.goto(url + hash, { waitUntil: 'networkidle0' }); await p.evaluate((seed) => { localStorage.clear(); for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, seed); await p.reload({ waitUntil: 'networkidle0' }); await sleep(300); };
const DONE = { 'bj-trainer:onboarding': { done: true } };

// welcome (first run)
{ const p = await mk(); await load(p, URL, '', {}); await p.screenshot({ path: 'screenshots/56-welcome-1.png' });
  await click(p, 'Next ›'); await sleep(300); await p.screenshot({ path: 'screenshots/56-welcome-2-rules.png' });
  await click(p, 'Next ›'); await sleep(300); await p.screenshot({ path: 'screenshots/56-welcome-3-disclaimer.png' });
  await p.close(); }

// shoe summary + last hand review
{ const p = await mk(); await load(p, URL, '#play', { ...DONE, 'bj-trainer:v1': { settings: { dealSpeed: 'instant', focus: 0 } } });
  let shown = false;
  for (let i = 0; i < 1500 && !shown; i++) {
    if (!(await click(p, 'Stand'))) { if (!(await click(p, 'No insurance'))) await click(p, 'Deal'); }
    // deliberately misplay sometimes so weak spots exist
    if (i % 5 === 0) await click(p, 'Hit');
    await sleep(25);
    shown = await p.evaluate(() => /Shoe finished/.test(document.body.innerText));
  }
  console.log('shoe summary shown', shown);
  await sleep(300); await p.screenshot({ path: 'screenshots/59-shoe-summary.png' });
  await click(p, 'Shuffle & keep going'); await sleep(300);
  // finish a hand then open review
  for (let i = 0; i < 20; i++) { if (!(await click(p, 'Stand'))) await click(p, 'No insurance'); await sleep(40); }
  await p.evaluate(() => document.querySelector('.lasthand').click()); await sleep(300);
  await p.close(); }

// stats with a second rule set
{ const p = await mk(); await load(p, URL, '#play', { ...DONE, 'bj-trainer:v1': { settings: { dealSpeed: 'instant', focus: 0 } } });
  for (let i = 0; i < 120; i++) { if (!(await click(p, 'Stand'))) { if (!(await click(p, 'No insurance'))) await click(p, 'Deal'); } if (i % 3 === 0) await click(p, 'Hit'); await sleep(20); }
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('bj-trainer:v1')); const b = structuredClone(Object.values(s.buckets)[0]); s.buckets['2D-S17-DAS-noLS-3:2'] = b; s.buckets['1D-H17-noDAS-noLS-6:5'] = structuredClone(b); localStorage.setItem('bj-trainer:v1', JSON.stringify(s)); });
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('.tab')].find((e) => e.textContent.includes('Stats')).click()); await sleep(300);
  await p.screenshot({ path: 'screenshots/62-stats-selector.png' });
  await click(p, '2 decks · S17 · DAS · no surr. · 3:2'); await sleep(300);
  await p.screenshot({ path: 'screenshots/62-stats-selector-other-rules.png' });
  await p.close(); }

// layout sweep at 375 and 430, every tab, plus sheets; detect horizontal overflow and clipped header
for (const w of [375, 430]) {
  const p = await mk(w, w === 375 ? 667 : 932); await load(p, NATIVE, '', { ...DONE, 'bj-trainer:v1': { settings: { dealSpeed: 'instant' } } });
  for (const tab of ['Learn', 'Drill', 'Play', 'Stats', 'Count']) {
    await p.evaluate((t) => [...document.querySelectorAll('.tab')].find((e) => e.textContent.includes(t)).click(), tab); await sleep(250);
    if (tab === 'Play') { await click(p, 'Deal'); await sleep(250); }
    const r = await p.evaluate(() => {
      const bad = [];
      const vw = document.documentElement.clientWidth;
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > vw + 1 || b.left < -1) && !el.closest('.scope, .tray, .chart-scroll, .scroll-x')) bad.push(`${el.tagName}.${el.className} ${Math.round(b.left)}..${Math.round(b.right)}`);
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible' && el.children.length === 0 && el.tagName === 'BUTTON') bad.push(`clipped-ish ${el.tagName}.${el.className} "${el.textContent.slice(0, 20)}"`);
      }
      const chip = document.querySelector('.rules-chip'); const gear = document.querySelector('.gear'); const h1 = document.querySelector('.title');
      return { bad: bad.slice(0, 6), chipTrunc: chip.scrollWidth > chip.clientWidth, chip: chip.textContent, gearRight: Math.round(gear.getBoundingClientRect().right), vw, h1Right: Math.round(h1.getBoundingClientRect().right), chipLeft: Math.round(chip.getBoundingClientRect().left) };
    });
    console.log(w, tab, JSON.stringify(r));
    if (tab === 'Play') await p.screenshot({ path: `screenshots/63-play-${w}.png` });
    if (tab === 'Learn') await p.screenshot({ path: `screenshots/63-learn-${w}.png` });
  }
  await p.close();
}
await browser.close();
