const { test, expect } = require('@playwright/test');
const express = require('express');
const path = require('node:path');
const { once } = require('node:events');

let server, base;
test.beforeAll(async () => {
  const app = express();
  // A subdirectory mount also catches accidental absolute asset/editor paths.
  app.use('/interstate', express.static(path.resolve(__dirname, '../../.build')));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/interstate`;
});
test.afterAll(() => new Promise(resolve => server.close(resolve)));

for (const route of ['/', '/tutorial/']) {
  test(`static hosting supports runtime and popup editor: ${route}`, async ({ context }) => {
    const errors = [];
    context.on('page', page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(response.url()); });
    });
    const page = await context.newPage();
    await page.goto(base + route);
    const popup = page.waitForEvent('popup');
    await page.locator('a').filter({ hasText: /^edit$/ }).click();
    const editor = await popup;
    if (route === '/tutorial/') {
      await expect(editor.locator('.instructions')).toContainText('This tutorial will teach you');
      await editor.locator('.next').click();
      await expect(editor.locator('.instructions')).toContainText('Position these windows');
      await expect(page.getByText('runtime', { exact: true })).toBeVisible();
    } else {
      await expect(editor.locator('.col').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
