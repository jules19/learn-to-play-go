/* Visual smoke test: loads the app headlessly, exercises every view,
 * captures screenshots, and fails on any console error. */
const { chromium } = require('playwright');
(async () => {

const BASE = 'http://localhost:8788';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') { const t = m.text(); if (!t.includes('Failed to load resource')) errors.push('console: ' + t); }
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'shots/01-learn-home.png' });

// open lesson 1 and walk a few steps
await page.click('.card-grid .card:first-child');
await page.waitForSelector('.panel-card');
await page.screenshot({ path: 'shots/02-lesson1.png' });
await page.click('#stepControls .btn.primary'); // continue past intro
await page.waitForTimeout(300);
// step 2: place a stone anywhere — click board center
const canvas = await page.$('.board-wrap canvas');
const box = await canvas.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/03-lesson1-stone.png' });

// puzzles view
await page.click('.tab[data-view="puzzles"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/04-puzzles.png' });
await page.click('.card-grid .card:first-child');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/05-puzzle1.png' });

// solve puzzle 1: black plays E4. Canvas geometry: margin ≈ 6.2% + 8.
{
  const b = await (await page.$('.board-wrap canvas')).boundingBox();
  const m = b.width * 0.062 + 8;
  const cell = (b.width - 2 * m) / 8;
  // E4 -> x=4, y=3 -> canvas row (8 - 3) = 5
  await page.mouse.click(b.x + m + 4 * cell, b.y + m + 5 * cell);
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/06-puzzle1-solved.png' });
}

// play view + start a game, make one move
await page.click('.tab[data-view="play"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/07-play-setup.png' });
await page.click('.btn.primary');
await page.waitForTimeout(400);
{
  const b = await (await page.$('.board-wrap canvas')).boundingBox();
  const m = b.width * 0.062 + 8;
  const cell = (b.width - 2 * m) / 8;
  await page.mouse.click(b.x + m + 2 * cell, b.y + m + 6 * cell); // C3
  await page.waitForTimeout(1600); // AI replies
  await page.screenshot({ path: 'shots/08-game.png' });
}

// guide
await page.click('.tab[data-view="guide"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/09-guide.png' });

await browser.close();

if (errors.length) {
  console.error('PAGE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('All views rendered without console errors.');
})().catch(e => { console.error(e); process.exit(1); });
