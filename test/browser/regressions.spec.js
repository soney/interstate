const { test, expect } = require('@playwright/test');

test('Breakout renders finite shapes and the ball moves without runtime errors', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  await page.goto('/build/?open=examples%2Fbreakout.ist');
  await expect(page.locator('.content svg circle')).toBeVisible();
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
  await page.goto('/build/');
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
  await page.goto('/build/');
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

test('unused sensors stay inactive and sensor values retain zeros and release listeners', async ({ page }) => {
  await page.goto('/build/');
  expect(await page.evaluate(() => {
    const ist = interstate, added = [], removed = [];
    const add = window.addEventListener, remove = window.removeEventListener;
    window.addEventListener = function(type, ...args) { added.push(type); return add.call(this, type, ...args); };
    window.removeEventListener = function(type, ...args) { removed.push(type); return remove.call(this, type, ...args); };
    const gyro = ist.createGyroscopeObject(), motion = ist.createAccelorometerObject();
    const initially = added.slice();
    const gc = ist.find_or_put_contextual_obj(gyro), mc = ist.find_or_put_contextual_obj(motion);
    const initialValues = [gc.prop_val('alpha'), mc.prop_val('x')];
    const orientation = new Event('deviceorientation');
    Object.assign(orientation, { alpha: 12, beta: 0, gamma: 0 });
    window.dispatchEvent(orientation);
    const changed = gc.prop_val('alpha');
    Object.assign(orientation, { alpha: 0 });
    window.dispatchEvent(orientation);
    const zero = gc.prop_val('alpha');
    window.dispatchEvent(new Event('devicemotion')); // unavailable acceleration data
    gyro.destroy(true); motion.destroy(true);
    window.addEventListener = add; window.removeEventListener = remove;
    return { initially, initialValues, changed, zero, added, removed };
  })).toEqual({ initially: [], initialValues: [0, 0], changed: 12, zero: 0, added: ['deviceorientation', 'devicemotion'], removed: ['deviceorientation', 'devicemotion'] });
});

test('destroyed or disabled timers cannot fire, and enabled timers still run', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/build/');
  const result = await page.evaluate(async () => {
    const ist = interstate, fired = [];
    for (const kind of ['timeout', 'time']) {
      const make = () => kind === 'timeout' ? new ist.TimeoutEvent(30) : new ist.TimeEvent(Date.now() + 30);
      const destroyed = make(), disabled = make(), working = make();
      destroyed.on_fire(() => fired.push('destroyed')); disabled.on_fire(() => fired.push('disabled'));
      working.on_fire(() => fired.push(kind));
      destroyed.enable(); disabled.enable(); working.enable();
      destroyed.destroy(); disabled.disable();
      await new Promise(r => setTimeout(r, 80));
      disabled.destroy(); working.destroy();
    }
    return fired;
  });
  expect(result).toEqual(['timeout', 'time']);
  expect(errors).toEqual([]);
});

test('statechart teardown during deferred transition rounds cancels remaining callbacks', async ({ page }) => {
  await page.goto('/build/');
  expect(await page.evaluate(() => {
    const ist = interstate;
    for (const round of [0, 2, 4]) {
      const chart = new ist.Statechart();
      chart.add_state('a').add_state('b').starts_at('a');
      const event = new ist.ManualEvent();
      chart.add_transition('a', 'b', event);
      ist.event_queue.once('end_event_queue_round_' + round, () => chart.destroy());
      event.fire();
    }
    return ist.event_queue.is_ready();
  })).toBe(true);
});

test('destroying a throttled event cancels pending delivery', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/build/');
  expect(await page.evaluate(async () => {
    const source = new interstate.ManualEvent(), delayed = source.throttle(30);
    let calls = 0;
    delayed.on_fire(() => calls++);
    delayed.enable(); source.fire(); delayed.destroy();
    await new Promise(r => setTimeout(r, 80));
    return calls;
  })).toBe(0);
  expect(errors).toEqual([]);
});
