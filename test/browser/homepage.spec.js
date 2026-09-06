const { test, expect } = require('@playwright/test');

test('project homepage retains its public navigation and local assets', async ({ page }) => {
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).hostname === '127.0.0.1' && response.status() >= 400) failures.push(response.url());
  });
  // The optional video is external; the project navigation must work without it.
  await page.route('https://www.youtube.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'InterState', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Editor Start a new program or open your saved work' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tutorial Step-by-step guide' })).toHaveAttribute('href', 'build/tutorial/');
  const paper = await page.getByRole('link', { name: 'Paper Presented at UIST 2014' }).getAttribute('href');
  expect((await page.request.get('/' + paper)).status()).toBe(200);
  await page.getByRole('link', { name: 'Open Editor Start a new program or open your saved work' }).click();
  await expect(page).toHaveURL(/\/build\/$/);
  await expect(page.getByRole('button', { name: /^Edit/ })).toBeVisible();
  expect(failures).toEqual([]);
});

for (const [label, path, example] of [
  ['Breakout', 'breakout/', 'breakout'],
  ['Drag Lock', 'drag_lock/', 'drag_lock'],
  ['Image Carousel', 'image_carousel/', 'img_carousel'],
  ['Maps (for touchscreens)', 'touch_map/', 'map']
]) {
  test(`homepage opens the published ${label} route`, async ({ page }) => {
    await page.route('https://www.youtube.com/**', route => route.abort());
    await page.goto('/');
    await page.locator(`a[href="${path.replace(/\/$/, '')}"], a[href="${path}"]`).first().click();
    await expect(page).toHaveURL(new RegExp('/build/index.html\\?open=examples/' + example + '.ist'));
    await expect(page.locator('.content svg').first()).toBeVisible();
    await expect.poll(() => page.locator('.content svg rect, .content svg circle, .content svg image').count()).toBeGreaterThan(0);
    if (example === 'img_carousel' || example === 'map') {
      const sources = await page.locator('.content svg image').evaluateAll(images => images.map(image => image.getAttribute('href') || image.getAttribute('xlink:href')));
      expect(sources.length).toBeGreaterThan(0);
      for (const source of sources) {
        const url = new URL(source, page.url());
        expect(url.hostname).toBe('127.0.0.1');
        expect((await page.request.get(url.href)).status()).toBe(200);
      }
      if (example === 'img_carousel') {
        const thumbnail = page.locator('.content svg image[width="75"]').first();
        const selected = await thumbnail.evaluate(image => image.getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
        expect(selected).toMatch(/\.jpg$/);
        await thumbnail.click();
        await expect.poll(() => page.locator('.content svg image[width="400"]').evaluate(image => image.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))).toBe(selected);
      }
    }
  });
}
