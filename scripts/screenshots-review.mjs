import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const p = await browser.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const click = (text) => p.evaluate((text) => { const el = [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === text && !e.disabled); if (el) { el.click(); return true; } return false; }, text);
await p.goto('http://localhost:4173/#play', { waitUntil: 'networkidle0' });
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('bj-trainer:onboarding', '{"done":true}'); localStorage.setItem('bj-trainer:v1', JSON.stringify({ settings: { dealSpeed: 'instant', focus: 0 } })); });
await p.reload({ waitUntil: 'networkidle0' }); await sleep(300);
for (let i = 0; i < 30; i++) {
  await click('Deal'); await sleep(60); await click('No insurance'); await sleep(60);
  if (await click('Hit')) { await sleep(60); await click('Stand'); await sleep(60); await click('Stand'); }
  await sleep(500);
  await p.evaluate(() => document.querySelector('.lasthand').click()); await sleep(200); const n = await p.evaluate(() => document.querySelectorAll('.rv-dec').length);
  if (n >= 1) break;
  await p.keyboard.press('Escape'); await sleep(100);
}
await sleep(300); await p.screenshot({ path: 'screenshots/60-last-hand-review.png' });
await browser.close();
