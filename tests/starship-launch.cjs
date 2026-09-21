// Run with Playwright installed; STARSHIP_TEST_URL defaults to the local dev server.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true
  });
  try {
    for (const earlyFrame of [false, true]) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      try {
        // Keep test visits isolated from the user's actual study records.
        await context.route('**/api/sync.php', route => route.fulfill({ json: { data: null } }));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        if (earlyFrame) {
          await page.addInitScript(() => {
            const raf = window.requestAnimationFrame.bind(window);
            let injected = false;
            window.requestAnimationFrame = callback => raf(now => {
              if (!injected && document.querySelector('.launch-flight')) {
                injected = true;
                callback(now - 100);
              } else callback(now);
            });
          });
        }
        await page.goto(process.env.STARSHIP_TEST_URL || 'http://localhost:8787/');
        assert.equal(await page.locator('#fuelPreview, #demoLaunch').count(), 0);
        for (const minutes of [0, 150, 299, 300, 360, 419, 420, 600, 720]) {
          await page.evaluate(value => { data.focused = value; elapsed = 0; updateStats(); }, minutes);
          const percent = `${Math.min(100, Math.floor(minutes / 600 * 100))}%`;
          assert.equal(await page.locator('#launchPercent').textContent(), percent);
          assert.equal(await page.locator('#progressPercent').textContent(), percent);
          assert.equal(await page.locator('#launchBtn').isEnabled(), minutes >= 420);
          assert.equal(await page.locator('#launchBtn').textContent(), minutes >= 420 ? 'Launch' : 'Pending');
          const colors = await page.evaluate(() => {
            const ctx = document.getElementById('launchScene').getContext('2d');
            return { booster: [...ctx.getImageData(540, 650, 1, 1).data], ship: [...ctx.getImageData(540, 320, 1, 1).data] };
          });
          if (minutes >= 300) assert.deepEqual(colors.booster, [203, 167, 53, 255]);
          if (minutes >= 420) assert.deepEqual(colors.ship, [203, 167, 53, 255]);
        }
        await page.evaluate(() => {
          data.focused = 419;
          applyTimelineConfig(['10:00','12:00','13:30','18:00','20:30','23:00']);updateStats();
        });
        assert.equal(await page.locator('#launchBtn').isEnabled(), true);
        await page.evaluate(() => { applyTimelineConfig(defaultTimeline);updateStats(); });
        assert.equal(await page.locator('#launchBtn').isEnabled(), false);
        await page.evaluate(() => { elapsed = 59; start(); });
        await page.waitForFunction(() => document.getElementById('launchPercent').textContent === '70%');
        await page.evaluate(() => pause());
        await page.locator('#launchBtn').click();
        await page.waitForFunction(() => document.getElementById('launchStatus').textContent.includes('LIFTOFF'));
        const belowGroundIsClear = await page.evaluate(() => {
          const canvas = document.querySelector('.launch-flight');
          const overlay = canvas.getBoundingClientRect();
          const scene = document.getElementById('launchScene').getBoundingClientRect();
          const ground = scene.top + scene.height * 412 / 424;
          const row = Math.max(0, Math.ceil((ground - overlay.top) * canvas.height / overlay.height) + 1);
          if (row >= canvas.height) throw new Error('Ground must be visible for the clipping check');
          const pixels = canvas.getContext('2d').getImageData(0, row, canvas.width, canvas.height - row).data;
          return pixels.every((value, index) => index % 4 !== 3 || value === 0);
        });
        assert.ok(belowGroundIsClear, 'Exhaust and glow must not extend below ground');
        assert.deepEqual(errors, []);
        await page.waitForFunction(() => document.getElementById('launchStatus').textContent.includes('发射成功'));
        assert.equal(await page.locator('.launch-flight').count(), 0);
        assert.equal(await page.locator('#launchBtn').isEnabled(), true);
        await page.evaluate(() => { delete data.dailyFocus[studyDayKey()];data.dayKey = '2000-01-01'; ensureCurrentDay(); });
        assert.equal(await page.locator('#launchPercent').textContent(), '0%');
        assert.equal(await page.locator('#progressPercent').textContent(), '0%');
        assert.equal(await page.locator('#launchBtn').isEnabled(), false);
        assert.deepEqual(errors, []);
        console.log(`PASS: ${earlyFrame ? 'early first frame' : 'normal timing'} completes launch and restores controls`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
