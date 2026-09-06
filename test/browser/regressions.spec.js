const { test, expect } = require('@playwright/test');

test('Breakout renders finite shapes and the ball moves without runtime errors', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  await page.goto('/?open=examples%2Fbreakout.ist');
  const ballPosition = () => page.evaluate(() => {
    const root = $('.content').dom_output('option', 'root');
    const ball = interstate.find_or_put_contextual_obj(root).prop_val('game').prop_val('ball').instances()[0];
    return [ball.prop_val('cx'), ball.prop_val('cy')];
  });
  await expect.poll(async () => (await ballPosition()).every(Number.isFinite)).toBe(true);
  const initial = await ballPosition();
  await expect.poll(ballPosition).not.toEqual(initial);
  // Exercise sustained simulation, including more than one animation frame.
  await page.evaluate(() => new Promise(resolve => {
    let frames = 0;
    function tick() { if (++frames >= 30) resolve(); else requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }));
  expect((await ballPosition()).every(Number.isFinite)).toBe(true);
  expect(await page.locator('svg [cx="NaN"], svg [cy="NaN"], svg [width="undefined"], svg [height="undefined"]').count()).toBe(0);
  expect(failures).toEqual([]);
});

test('non-bubbling DOM events batch transitions and release the queue', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const ist = interstate, target = document.createElement('input');
    document.body.appendChild(target);
    const first = new ist.DOMEvent('focus', target), second = new ist.DOMEvent('focus', target);
    let value = 0;
    const observations = [];
    first.on_fire(() => { value = 1; });
    second.on_fire_request(() => observations.push(value));
    first.enable(); second.enable();
    target.dispatchEvent(new Event('focus', { bubbles: false }));
    first.destroy(); second.destroy();
    target.dispatchEvent(new Event('focus', { bubbles: false }));
    target.remove();
    return { observations, value, ready: ist.event_queue.is_ready() };
  });
  expect(result).toEqual({ observations: [0], value: 1, ready: true });
});

test('constraint invalidation does not re-enter an unfinished getter', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => {
    const cjs = interstate.cjs, source = cjs(0);
    let calls = 0;
    const derived = cjs(() => {
      const value = source.get();
      if (++calls > 3) throw new Error('Getter re-entered during construction');
      if (value === 0) source.set(1);
      return source.get();
    }, { check_on_nullify: true });
    const first = derived.get(), afterFirst = calls, second = derived.get();
    derived.destroy(); source.destroy();
    return [first, second, afterFirst];
  })).toEqual([1, 1, 1]);
});
