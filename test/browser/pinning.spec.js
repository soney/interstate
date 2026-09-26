const { test, expect } = require('@playwright/test');

// Opens the editor on Drag Lock's sketch.paper
async function openPaper(page) {
  await page.goto('/build/?open=examples%2Fdrag_lock.ist');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /^Edit/ }).press('Enter');
  const editor = await popup;
  const sketch = editor.locator('.col').first();
  await expect(sketch).toBeVisible();
  await sketch.locator('tr.child').filter({ has: editor.locator('td.name', { hasText: /^\s*paper\s*$/ }) }).locator('td.value_summary').click();
  await expect(editor.locator('.col')).toHaveCount(2);
  // Wait for the rows to stop moving: their previews render (and resize them) a moment later,
  // and a drag starts from whatever is under the point where the mouse was pressed.
  let previous, stableReads = 0;
  await expect.poll(async () => {
    const box = JSON.stringify(await editor.locator('.col').nth(1).boundingBox());
    stableReads = box === previous ? stableReads + 1 : 0;
    previous = box;
    return stableReads;
  }, { intervals: [400] }).toBeGreaterThanOrEqual(2);
  return editor;
}

const row = (editor, name) => editor.locator('.col').nth(1).locator('tr.child')
  .filter({ has: editor.locator('td.name', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) }).locator('td.name');

async function startDrag(editor, source) {
  await source.hover();
  await editor.mouse.down();
  const box = await source.boundingBox();
  await editor.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10, { steps: 5 });
}

for (const [what, pinned] of [['column', 'paper'], ['object row', 'draggable']]) {
  test(`dragging a ${what} onto "Drop here to pin" pins it`, async ({ page }) => {
    const editor = await openPaper(page);
    await startDrag(editor, what === 'column' ? editor.locator('.col').nth(1).locator('.obj_name h2') : row(editor, 'draggable'));
    const dropArea = editor.getByText('Drop here to pin');
    await expect(dropArea).toBeVisible();
    const box = await dropArea.boundingBox();
    await editor.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await editor.mouse.up();
    await expect(editor.locator('#pinned .col .obj_name h2')).toHaveText([pinned]);
  });
}

test('dragging a property that is not an object does not offer to pin it', async ({ page }) => {
  const editor = await openPaper(page);
  await startDrag(editor, row(editor, 'width'));
  await editor.waitForTimeout(300);
  await expect(editor.getByText('Drop here to pin')).toHaveCount(0);
  await editor.mouse.up();
});
