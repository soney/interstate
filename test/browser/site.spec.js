const { test, expect } = require('@playwright/test');

function captureFailures(context) {
  const failures = [];
  context.on('page', page => {
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
  });
  return failures;
}

test('runtime and popup editor work with only local assets', async ({ context }) => {
  const failures = captureFailures(context);
  await context.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') {
      failures.push(`External dependency: ${route.request().url()}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('a').filter({ hasText: /^edit$/ })).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await page.locator('a').filter({ hasText: /^edit$/ }).click();
  const editor = await popupPromise;
  await expect(editor.locator('.col').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => $('.content').dom_output('get_server_socket').is_connected())).toBe(true);
  await editor.getByText('Add Field', { exact: true }).first().click();
  await editor.getByPlaceholder('Field name').fill('smoke_object');
  await editor.getByPlaceholder('Field name').press('Enter');
  await expect.poll(() => page.evaluate(() => $('.content').dom_output('option', 'root')._has_direct_prop('smoke_object'))).toBe(true);
  await page.evaluate(() => interstate.save($('.content').dom_output('option', 'root')));
  await editor.close();
  await page.reload();
  await expect.poll(() => page.evaluate(() => $('.content').dom_output('option', 'root')._has_direct_prop('smoke_object'))).toBe(true);
  expect(failures).toEqual([]);
});

for (const example of ['breakout', 'drag_lock', 'img_carousel', 'map']) {
  test(`example loads: ${example}`, async ({ context }) => {
    const failures = captureFailures(context);
    const page = await context.newPage();
    await page.goto(`/?open=examples%2F${example}.ist`);
    await expect(page.locator('a').filter({ hasText: /^edit$/ })).toBeVisible();
    expect(failures).toEqual([]);
  });
}

test('tutorial initializes', async ({ context }) => {
  const failures = captureFailures(context);
  const page = await context.newPage();
  await page.goto('/tutorial/');
  await expect(page.locator('a').filter({ hasText: /^edit$/ })).toBeVisible();
  expect(failures).toEqual([]);
});

test('legacy QUnit regression suite', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/test/unit_tests/unit_tests.ejs.html');
  const result = await page.evaluate(() => new Promise(resolve => {
    const failures = [];
    QUnit.config.testTimeout = 10000;
    QUnit.log(details => { if (!details.result) failures.push({ name: details.name, message: details.message, actual: String(details.actual), expected: String(details.expected) }); });
    QUnit.done(details => resolve({ ...details, failures }));
  }));
  console.log(`Legacy suite: ${result.passed}/${result.total} assertions passed`);
  expect(result.failures).toEqual([]);
  expect(result.total).toBeGreaterThan(100);
});
