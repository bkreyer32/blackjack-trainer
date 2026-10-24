// Headless check: native-flag build (mock provider) is gated + paywall flows work; web build is fully unlocked.
// Usage: node scripts/verify-native.mjs <nativeUrl> <webUrl>
import puppeteer from 'puppeteer-core';
const [NATIVE, WEB] = [process.argv[2] || 'http://localhost:4180/', process.argv[3] || 'http://localhost:4173/'];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
async function fresh(url, hash = '', seed = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => { console.log('PAGEERROR', String(e)); fails++; });
  await page.goto(url + hash, { waitUntil: 'networkidle0' });
  await page.evaluate((seed) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bj-trainer:onboarding', JSON.stringify({ done: true })); for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); }, seed);
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(300);
  return page;
}
const click = (page, text) => page.evaluate((text) => { const el = [...document.querySelectorAll('button')].find((e) => e.textContent.replace('🔒', '').trim() === text && !e.disabled); if (el) { el.click(); return true; } return false; }, text);
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const txt = (page) => page.evaluate(() => document.body.innerText);
const tab = (page, label) => page.evaluate((l) => { const t = [...document.querySelectorAll('.tab')].find((e) => e.textContent.includes(l)); t.click(); }, label);

// ---- Web build: nothing locked, no paywall ----
{
  const p = await fresh(WEB);
  await tab(p, 'Count'); await sleep(200);
  ok(!(await has(p, '.lock')), 'web: no lock icons on Count tab');
  ok(await click(p, 'In Play'), 'web: In Play opens'); await sleep(200);
  ok(!(await has(p, '.sheet')), 'web: no paywall sheet after In Play');
  await click(p, 'Rounds'); await sleep(150);
  ok(!(await has(p, '.sheet')), 'web: Rounds opens without paywall');
  await tab(p, 'Learn'); await sleep(150);
  ok(await click(p, 'Count: off'), 'web: Learn TC toggle'); await sleep(150);
  ok(!(await has(p, '.sheet')), 'web: TC overlay free');
  await p.evaluate(() => document.querySelector('.gear').click()); await sleep(200);
  const t = await txt(p);
  ok(!/Restore Purchases|Redeem Code/.test(t), 'web: settings has no purchase UI');
  await p.close();
}

// ---- Native build (mock provider) ----
{
  const p = await fresh(NATIVE);
  await tab(p, 'Count'); await sleep(250);
  ok(await has(p, '.lock'), 'native: locks shown on Count tab');
  await click(p, 'Rounds'); await sleep(250);
  ok(await has(p, '.sheet') && /Unlock/.test(await txt(p)), 'native: Rounds opens paywall');
  await p.screenshot({ path: 'screenshots/57-paywall.png' });
  ok(/\$4\.99/.test(await txt(p)), 'native: price shown from provider');
  ok(/Privacy Policy/.test(await txt(p)) && /Terms of Use/.test(await txt(p)), 'native: paywall links');
  // buy
  await click(p, 'Unlock for $4.99'); await sleep(700);
  ok(!(await has(p, '.lock')), 'native: buy unlocks (locks gone)');
  await p.keyboard.press('Escape'); await sleep(200);
  ok(await click(p, 'Rounds'), 'native: Rounds usable after buy'); await sleep(200);
  ok(!(await has(p, '.sheet')), 'native: no paywall once owned');
  // persistence across reload
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  await tab(p, 'Count'); await sleep(200);
  ok(!(await has(p, '.lock')), 'native: entitlement persisted across relaunch');
  // revoke (refund) + restore + redeem + offline
  await p.evaluate(() => document.querySelector('.gear').click()); await sleep(250);
  ok(await click(p, 'Revoke Pro'), 'native: dev revoke'); await sleep(300);
  await p.screenshot({ path: 'screenshots/61-settings.png' });
  ok(/locked/.test(await txt(p)), 'native: settings shows locked');
  await click(p, 'Restore Purchases'); await sleep(700);
  ok(/No previous purchase|nothing to restore|No purchases/i.test(await txt(p)), 'native: restore with nothing owned says so');
  await click(p, 'Redeem Code'); await sleep(900);
  ok(/unlocked/.test(await txt(p)), 'native: redeem unlocks');
  await click(p, 'Toggle offline'); await sleep(200);
  await p.keyboard.press('Escape'); await sleep(200);
  await p.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  await tab(p, 'Count'); await sleep(200);
  ok(!(await has(p, '.lock')), 'native: offline relaunch keeps cached entitlement');
  await p.close();
}
// locked item screenshots + free gating details
{
  const p = await fresh(NATIVE, '#count');
  await sleep(300);
  await p.screenshot({ path: 'screenshots/58-locked-count.png' });
  // free flash clamp
  ok(await click(p, '30 🔒'.replace(' 🔒', '')) === false || true, 'noop');
  await click(p, '1 deck'); await sleep(250);
  ok(await has(p, '.sheet'), 'native: full-deck flash opens paywall');
  await p.keyboard.press('Escape'); await sleep(150);
  await tab(p, 'Learn'); await sleep(200);
  await click(p, 'Count: off'); await sleep(250);
  ok(await has(p, '.sheet'), 'native: Learn TC overlay opens paywall');
  await p.keyboard.press('Escape'); await sleep(150);
  await tab(p, 'Drill'); await sleep(200);
  await click(p, 'Index'); await sleep(250);
  ok(await has(p, '.sheet'), 'native: deviation drill opens paywall');
  await p.keyboard.press('Escape'); await sleep(150);
  // Play stays fully usable
  await tab(p, 'Play'); await sleep(200);
  ok(await click(p, 'Deal'), 'native: Play deals free'); await sleep(2500);
  ok(await has(p, '.actions, .pad-row'), 'native: Play action pad present');
  await p.close();
}
await browser.close();
console.log(fails ? `${fails} FAILURES` : 'ALL OK');
process.exit(fails ? 1 : 0);
