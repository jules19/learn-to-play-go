/* E2E: the two most intricate lesson mechanics —
 * Lesson 5's eight-move scripted ladder chase (with AI replies)
 * and Lesson 7's tryIllegal step — plus the badges modal. */
const { chromium } = require('playwright');

const LETTERS = 'ABCDEFGHJ';

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

  async function clickPoint(coord) {
    const x = LETTERS.indexOf(coord[0]);
    const y = parseInt(coord.slice(1), 10) - 1;
    const b = await (await page.$('.board-wrap canvas')).boundingBox();
    const m = b.width * 0.062 + 8;
    const cell = (b.width - 2 * m) / 8;
    await page.mouse.click(b.x + m + x * cell, b.y + m + (8 - y) * cell);
  }
  const cont = async () => {
    await page.waitForSelector('#stepControls .btn.primary', { timeout: 6000 });
    await page.click('#stepControls .btn.primary');
    await page.waitForTimeout(250);
  };

  await page.goto('http://localhost:8788', { waitUntil: 'networkidle' });

  /* ---- Lesson 5: the ladder ---- */
  await page.click('.card-grid .card:nth-child(5)');
  await page.waitForSelector('.panel-card');
  await cont(); // intro
  for (const mv of ['E3', 'G4', 'F2', 'H3', 'G1', 'H1', 'J3', 'J1']) {
    await clickPoint(mv);
    await page.waitForTimeout(800); // scripted white reply
  }
  const ladderMsg = await page.textContent('#senseiMsg');
  if (!ladderMsg.includes('CAPTURED')) {
    throw new Error('ladder did not complete: ' + ladderMsg);
  }
  await page.screenshot({ path: 'shots/12-ladder-done.png' });
  await cont(); // outro info
  await page.click('#stepControls .btn.primary'); // finish lesson
  await page.waitForSelector('.card-grid');
  if (!await page.$('.card-grid .card:nth-child(5).done')) {
    throw new Error('lesson 5 not marked done');
  }
  console.log('Lesson 5 ladder chase: complete, 8 stones captured.');

  /* ---- Lesson 7: tryIllegal ---- */
  await page.click('.card-grid .card:nth-child(7)');
  await page.waitForSelector('.panel-card');
  await clickPoint('E5'); // forbidden point — engine must reject
  await page.waitForTimeout(700);
  const msg = await page.textContent('#senseiMsg');
  if (!msg.includes('Rejected')) throw new Error('tryIllegal flow failed: ' + msg);
  await cont();
  await clickPoint('E5'); // same point now captures four
  await page.waitForTimeout(700);
  await cont();
  await page.click('.choice:has-text("captures enemy stones first")');
  await page.waitForTimeout(300);
  await page.click('#stepControls .btn.primary');
  await page.waitForSelector('.card-grid');
  console.log('Lesson 7 forbidden-point flow: works.');

  /* ---- badges modal ---- */
  await page.click('#badgesBtn');
  await page.waitForSelector('.badge-grid');
  const earned = await page.$$eval('.badge-item:not(.locked)', els => els.length);
  if (earned < 2) throw new Error('expected earned badges, got ' + earned);
  console.log(`Badges modal: ${earned} badges earned and displayed.`);

  await browser.close();
  if (errors.length) {
    console.error('PAGE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
