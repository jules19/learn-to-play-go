/* E2E: drives a full game to the scoring phase by passing every turn
 * (the AI plays until nothing is worth playing, then passes back),
 * then confirms the score and checks the final result appears. */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('Failed to load resource')) {
      errors.push('console: ' + t);
    }
  });

  await page.goto('http://localhost:8788', { waitUntil: 'networkidle' });
  await page.click('.tab[data-view="play"]');
  await page.click('.btn.primary'); // begin vs Pebble as Black
  await page.waitForSelector('.game-status');

  let scored = false;
  for (let i = 0; i < 400; i++) {
    const confirm = await page.$('button:has-text("Confirm score")');
    if (confirm) {
      await page.screenshot({ path: 'shots/10-scoring.png' });
      await confirm.click();
      scored = true;
      break;
    }
    const pass = await page.$('button:has-text("Pass")');
    if (!pass) break;
    const status = await page.textContent('.game-status');
    if (status.includes('Your move')) await pass.click();
    await page.waitForTimeout(350);
  }

  if (!scored) throw new Error('never reached the scoring phase');
  await page.waitForSelector('.score-panel');
  const result = await page.textContent('.score-panel .score-row.total');
  console.log('Final result shown:', result.trim());
  await page.screenshot({ path: 'shots/11-result.png' });

  await browser.close();
  if (errors.length) {
    console.error('PAGE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('Scoring flow works end to end.');
})().catch((e) => { console.error(e); process.exit(1); });
