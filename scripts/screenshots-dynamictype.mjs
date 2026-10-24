// Simulates the largest Dynamic Type size we allow (root 23px) and checks tabs for horizontal overflow.
import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://localhost:4173/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [w, h] of [[375, 667], [390, 844]]) {
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('bj-trainer:onboarding', '{"done":true}'); });
  await p.reload({ waitUntil: 'networkidle0' });
  await p.addStyleTag({ content: 'html{font-size:23px !important}' }); await sleep(300);
  for (const tab of ['Learn', 'Drill', 'Play', 'Stats', 'Count']) {
    await p.evaluate((t) => [...document.querySelectorAll('.tab')].find((e) => e.textContent.includes(t)).click(), tab); await sleep(250);
    if (tab === 'Play') { await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Deal')?.click()); await sleep(1500); }
    const o = await p.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > vw + 1 && !e.closest('.scope'); }).slice(0, 4).map((e) => `${e.tagName}.${e.className}`); });
    console.log(w, tab, o.length ? 'OVERFLOW ' + o.join(', ') : 'ok');
    if (tab === 'Play' || tab === 'Count') await p.screenshot({ path: `screenshots/65-dynamic-type-${tab.toLowerCase()}-${w}.png` });
  }
  await p.close();
}
await browser.close();
