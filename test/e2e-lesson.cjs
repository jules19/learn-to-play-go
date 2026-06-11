/* E2E: completes Lesson 3 (Capture!) end to end via real clicks —
 * info step, three interactive capture steps (including one deliberate
 * wrong move to exercise the retry flow), and the quiz. */
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
    await page.waitForSelector('#stepControls .btn.primary', { timeout: 5000 });
    await page.click('#stepControls .btn.primary');
    await page.waitForTimeout(250);
  };

  await page.goto('http://localhost:8788', { waitUntil: 'networkidle' });
  // open lesson 3
  await page.click('.card-grid .card:nth-child(3)');
  await page.waitForSelector('.panel-card');

  await cont();                       // step 1: info
  // step 2: deliberately wrong move first — board must reset
  await clickPoint('B7');
  await page.waitForTimeout(1400);    // wrongMsg + reset
  const bubble1 = await page.textContent('#senseiMsg');
  if (!bubble1.includes('breathing space')) {
    throw new Error('wrong-move feedback missing, got: ' + bubble1);
  }
  await clickPoint('E4');             // correct capture
  await page.waitForTimeout(600);
  await cont();
  // step 3: capture the two-stone group
  await clickPoint('E3');
  await page.waitForTimeout(600);
  await cont();
  // step 4: edge capture
  await clickPoint('A4');
  await page.waitForTimeout(600);
  await cont();
  // step 5: quiz — pick the correct answer
  await page.click('.choice:has-text("removed from the board")');
  await page.waitForTimeout(300);
  await page.click('#stepControls .btn.primary'); // Finish lesson

  // back at learn home with lesson 3 marked done
  await page.waitForSelector('.card-grid');
  const done = await page.$('.card-grid .card:nth-child(3).done');
  if (!done) throw new Error('lesson 3 not marked complete');
  console.log('Lesson 3 completed end to end (including wrong-move retry).');

  await browser.close();
  if (errors.length) {
    console.error('PAGE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
