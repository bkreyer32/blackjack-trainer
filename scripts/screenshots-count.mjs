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
  const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim() === text && !e.disabled)
    || [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(text) && !e.disabled);
  if (el) { el.click(); return true; } return false;
}, sel, text);
const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const typeNum = async (n) => { if (n < 0) await click('+/−'); for (const d of String(Math.abs(n))) await click(d, '.kp-key'); };
const go = async (hash) => { await page.goto(URL + hash, { waitUntil: 'networkidle0' }); await page.reload({ waitUntil: 'networkidle0' }); };

await go('#count');
await page.evaluate(() => {
  const k = 'bj-trainer:v1';
  const s = JSON.parse(localStorage.getItem(k) || '{}');
  s.settings = { ...(s.settings || {}), count: { speed: 0.4, flashCards: 10, flashDecks: 0, players: 3, quizEvery: 1, quizTc: true, showDecksLeft: true, tcConvention: 'truncate', tcTolerance: false, spread: '1-8', countInPlay: false, playQuizEvery: 1 } };
  localStorage.setItem(k, JSON.stringify(s));
  sessionStorage.setItem('count-sub', 'flash');
});
await go('#count');
// Flash: run once, answer, go again for history
await click('Start'); await sleep(1500);
await page.screenshot({ path: `${out}/6-count-flash-card.png` });
while (!(await has('.keypad'))) await sleep(200);
await typeNum(2); await sleep(150);
await page.screenshot({ path: `${out}/7-count-keypad.png` });
await click('Submit'); await sleep(300);
await click('Go again'); while (!(await has('.keypad'))) await sleep(200);
await typeNum(-1); await click('Submit'); await sleep(300);
await click('Review cards'); await sleep(200);
await page.screenshot({ path: `${out}/8-count-flash-result.png` });

// Rounds
await click('Rounds'); await sleep(200);
await page.screenshot({ path: `${out}/9-count-rounds-setup.png` });
await click('Deal rounds');
await sleep(2200);
await page.screenshot({ path: `${out}/10-count-rounds-dealing.png` });
while (!(await has('.keypad'))) await sleep(200);
await typeNum(3); await click('Submit'); await sleep(200);
await typeNum(1);
await page.screenshot({ path: `${out}/11-count-rounds-tc.png` });
await click('Submit'); await sleep(300);
await page.screenshot({ path: `${out}/12-count-rounds-feedback.png` });

// In Play
await click('In Play'); await sleep(200);
await click('On'); await sleep(200);
await page.screenshot({ path: `${out}/13-count-inplay-settings.png` });
await go('#play');
let gotBet = false, gotQuiz = false;
for (let i = 0; i < 12 && !gotQuiz; i++) {
  await click('Next hand (bet)'); await sleep(250);
  if (await has('.keypad')) {
    await typeNum(-2); await sleep(100);
    if (!gotQuiz) await page.screenshot({ path: `${out}/15-play-count-quiz.png` });
    gotQuiz = true;
    await click('Submit'); await sleep(200);
    await typeNum(0); await click('Submit'); await sleep(250);
  }
  if (await has('.btn.bet')) {
    if (!gotBet || gotQuiz) await page.screenshot({ path: `${out}/${gotQuiz ? '16-play-count-feedback-bet' : '14-play-bet'}.png` });
    gotBet = true;
    await page.evaluate(() => document.querySelectorAll('.btn.bet')[1].click()); await sleep(250);
  }
  for (let k = 0; k < 8 && (await has('.pad')); k++) { await click('Stand'); await sleep(200); }
}
await page.screenshot({ path: `${out}/17-play-counting-hand.png` });

await go('#stats');
await page.evaluate(() => document.querySelector('.screen').scrollTo(0, 99999)); await sleep(200);
await page.screenshot({ path: `${out}/18-stats-count.png` });
console.log(JSON.stringify({ errors }));
await browser.close();
