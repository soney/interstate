const { test, expect } = require('@playwright/test');
let failures;
test.beforeEach(async ({ page }) => {
  failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') failures.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
});
test.afterEach(() => expect(failures).toEqual([]));

async function open(page, name) {
  await page.goto(`/build/?open=examples/${name}.ist`);
  await expect(page.locator('.content svg').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
}
async function position(shape) {
  return shape.evaluate(el => ['x', 'y', 'width', 'height'].map(k => Number(el.getAttribute(k))));
}

test('drag lock drags, releases, locks dragging on, and unlocks', async ({ page }) => {
  await open(page, 'drag_lock');
  const rect = page.locator('.content svg rect').first();
  await page.mouse.move(85, 60);
  await page.mouse.down();
  await page.mouse.move(180, 180, { steps: 5 });
  await expect.poll(() => position(rect)).toEqual([105, 130, 150, 100]);
  await page.mouse.up();
  await page.mouse.move(250, 250);
  expect(await position(rect)).toEqual([105, 130, 150, 100]);
  await rect.dblclick();
  await expect(page.locator('.content svg text')).toHaveText('click to release');
  await page.mouse.move(240, 240, { steps: 5 });
  await expect.poll(() => position(rect)).toEqual([165, 190, 150, 100]);
  await rect.click();
  await page.mouse.move(300, 300);
  expect(await position(rect)).toEqual([165, 190, 150, 100]);
});

test('carousel selects every photo and automatically advances', async ({ page }) => {
  await open(page, 'img_carousel');
  const main = page.locator('.content svg image[width="400"]');
  // Timer updates must not remove/reinsert thumbnails while a user clicks.
  await page.evaluate(() => {
    window.thumbnailMoves = 0;
    window.thumbnailObserver = new MutationObserver(records => {
      for (const record of records) for (const node of record.removedNodes) {
        if (node.nodeType === 1 && node.matches('image[width="75"]')) thumbnailMoves++;
      }
    });
    thumbnailObserver.observe(document.querySelector('.content svg'), { childList: true });
  });
  const source = el => el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  for (const name of ['leaf', 'tulips', 'winter', 'wonderland', 'fish']) {
    await page.locator(`.content svg image[width="75"][*|href$="${name}.jpg"]`).click({ delay: 50 });
    await expect.poll(() => main.evaluate(source)).toContain(name + '.jpg');
  }
  await expect.poll(() => main.evaluate(source), { timeout: 8000 }).toContain('leaf.jpg');
  expect(await page.evaluate(() => { thumbnailObserver.disconnect(); return thumbnailMoves; })).toBe(0);
});

test('Breakout responds to mouse and keyboard controls', async ({ page }) => {
  await open(page, 'breakout');
  const paddle = page.locator('.content svg rect[height="10"]');
  await page.locator('input[type="checkbox"]').check();
  await page.mouse.move(250, 350);
  await expect.poll(() => position(paddle)).toEqual([175, 390, 150, 10]);
  await page.locator('input[type="checkbox"]').uncheck();
  const before = await position(paddle);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await position(paddle))[0]).toBeGreaterThan(before[0]);
  const left = await position(paddle);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await position(paddle))[0]).toBeLessThan(left[0]);
  // Keep the simulation running through brick collisions and ball removal.
  await page.waitForTimeout(7000);
  expect(await page.evaluate(() => interstate.find_or_put_contextual_obj($('.content').dom_output('option', 'root')).prop_val('game').prop_val('score'))).toBeGreaterThanOrEqual(10);
});

async function touch(page, type, points, changed = points) {
  await page.evaluate(({ type, points, changed }) => {
    const target = document.querySelector('.content svg image');
    const convert = ([identifier, clientX, clientY]) => ({ identifier, clientX, clientY, pageX: clientX, pageY: clientY, screenX: clientX, screenY: clientY, target });
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, { touches: { enumerable: true, value: points.map(convert) }, targetTouches: { enumerable: true, value: points.map(convert) }, changedTouches: { enumerable: true, value: changed.map(convert) } });
    target.dispatchEvent(event);
  }, { type, points, changed });
}
test('map pans, pinches, releases touches, and fits the viewport', async ({ page }) => {
  await open(page, 'map');
  const map = page.locator('.content svg image').first();
  await touch(page, 'touchstart', [[1, 300, 300]]);
  await touch(page, 'touchmove', [[1, 200, 200]]);
  await expect.poll(async () => (await position(map)).slice(0, 2)).toEqual([-100, -100]);
  await touch(page, 'touchend', [], [[1, 200, 200]]);
  await touch(page, 'touchstart', [[2, 200, 200], [3, 400, 200]]);
  await touch(page, 'touchmove', [[2, 150, 200], [3, 450, 200]]);
  await expect.poll(async () => (await position(map))[2]).toBeGreaterThan(4642);
  await touch(page, 'touchend', [], [[2, 150, 200], [3, 450, 200]]);
  const beforeCancel = (await position(map)).slice(0, 2);
  await touch(page, 'touchstart', [[4, 200, 200]]);
  await touch(page, 'touchcancel', [], [[4, 200, 200]]);
  await touch(page, 'touchstart', [[5, 200, 200]]);
  await touch(page, 'touchmove', [[5, 180, 180]]);
  await expect.poll(async () => (await position(map)).slice(0, 2)).toEqual(beforeCancel.map(v => v - 20));
  await touch(page, 'touchend', [], [[5, 180, 180]]);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([viewport.width, viewport.height]);
  }
});

test('native touch panning does not trigger page scrolling', async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'Native multi-touch injection requires Chromium CDP; gesture logic is tested in every engine above.');
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') failures.push(m.text()); });
  page.on('pageerror', e => failures.push(e.message));
  await open(page, 'map');
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 300 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 200 }] });
  await expect.poll(async () => (await position(page.locator('svg image').first())).slice(0, 2)).toEqual([-100, -100]);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
  await context.close();
});
