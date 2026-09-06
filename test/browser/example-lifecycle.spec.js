const { test, expect } = require('@playwright/test');
let errors;
test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if(r.status() >= 400) errors.push(r.url()); });
});
test.afterEach(() => expect(errors).toEqual([]));
const gameValue = (page, key) => page.evaluate(key => interstate.find_or_put_contextual_obj($('.content').dom_output('option', 'root')).prop_val('game').prop_val(key), key);
async function launchBall(page, x, y, vy) {
  await page.evaluate(({ x, y, vy }) => {
    const game = interstate.find_or_put_contextual_obj($('.content').dom_output('option', 'root')).prop_val('game');
    const ball = game.prop_val('ball').instances().find(b => b.get_attachment_instance('box2d_fixture'));
    const body = ball.get_attachment_instance('box2d_fixture').body.get();
    body.SetPosition(new Box2D.Common.Math.b2Vec2(x / 30, y / 30));
    body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, vy));
    body.SetAwake(true);
  }, { x, y, vy });
}
for (const name of ['breakout', 'drag_lock', 'img_carousel', 'map']) {
  test(`${name} fits narrow and short windows after repeated resizing`, async ({ page }) => {
    await page.goto(`/build/?open=examples/${name}.ist`);
    await expect(page.locator('.content svg')).toBeVisible();
    for (const size of [{ width: 320, height: 480 }, { width: 640, height: 360 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await expect.poll(() => page.evaluate(() => {
        window.scrollTo(100, 100);
        const box = document.querySelector('.content svg').getBoundingClientRect();
        return { scroll: [scrollX, scrollY], fits: box.right <= innerWidth && box.bottom <= innerHeight };
      })).toEqual({ scroll: [0, 0], fits: true });
      if (name === 'breakout') {
        await page.mouse.move(200, 200);
        await expect.poll(() => page.locator('.content svg rect[height="10"]').getAttribute('x')).toBe('125');
      }
      if (name === 'img_carousel') {
        const photos = page.locator('.content svg image');
        await page.locator('.content svg image[*|href$="tulips.jpg"]').first().click({ delay: 50 });
        await expect.poll(() => photos.last().evaluate(el => el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toContain('tulips.jpg');
        expect(await photos.count()).toBe(6);
      }
    }
  });
}

test('Breakout loses its last ball, stays ended, and restarts repeatedly', async ({ page }) => {
  await page.goto('/build/?open=examples/breakout.ist');
  for (let attempt = 0; attempt < 3; attempt++) {
    await expect(page.locator('.content svg circle')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeChecked();
    await page.mouse.move(0, 100);
    // Move the real Box2D body toward the bottom wall, clear of the paddle.
    await launchBall(page, 380, 370, 10);
    const end = page.getByText('Game over', { exact: true });
    await expect(end).toBeVisible();
    await expect(page.locator('.content svg circle')).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(await gameValue(page, 'game_over')).toBe(true);
    const restart = page.getByRole('button', { name: 'Restart', exact: true });
    if (attempt === 1) { await restart.focus(); await page.keyboard.press('Enter'); }
    else { await restart.click(); }
    await expect(page.locator('.content svg circle')).toBeVisible();
    expect(await gameValue(page, 'level')).toBe(1);
    expect(await gameValue(page, 'score')).toBe(0);
  }
});

test('Breakout clears a level through collisions and continues playing', async ({ page }) => {
  await page.goto('/build/?open=examples/breakout.ist');
  await expect(page.locator('.content svg circle')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await launchBall(page, i * 80 + 40, 45, -10);
    await expect.poll(() => gameValue(page, 'score')).toBeGreaterThanOrEqual((i + 1) * 10);
  }
  await expect.poll(() => gameValue(page, 'level')).toBe(2);
  await expect(page.locator('.content svg circle')).toBeVisible();
  // Exercise power-up expiration and frame/collision callbacks over longer play.
  await page.waitForTimeout(12000);
  expect(await gameValue(page, 'score')).toBeGreaterThanOrEqual(50);
});

test('closing Breakout releases physics animation and collision subscriptions', async ({ page }) => {
  await page.goto('/build/?open=examples/breakout.ist');
  await expect(page.locator('.content svg circle')).toBeVisible();
  const result = await page.evaluate(async () => {
    const ist = interstate, root = $('.content').dom_output('option', 'root');
    const game = ist.find_or_put_contextual_obj(root).prop_val('game');
    const world = game.prop_val('world').get_attachment_instance('box2d_world');
    let steps = 0;
    const step = world.world.Step;
    world.world.Step = function(...args) { steps++; return step.apply(this, args); };
    await new Promise(r => setTimeout(r, 80));
    const wasRunning = steps > 0;
    $('.content').dom_output('destroy');
    root.destroy();
    const atClose = steps;
    await new Promise(r => setTimeout(r, 150));
    return { wasRunning, stopped: world.stopped, extraSteps: steps - atClose, listeners: ist.contact_listeners.keys().length };
  });
  expect(result).toEqual({ wasRunning: true, stopped: true, extraSteps: 0, listeners: 0 });
});
