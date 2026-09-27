const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

// Runs axe's WCAG 2.2 A and AA checks on the page, and returns what fails
async function wcagViolations(page) {
  // The editor's Ace replaces Object.defineProperty with a version that axe can't start with, and
  // its AMD-style `define` would capture axe: set both aside while axe loads and runs
  await page.evaluate(() => {
    window.__axeSaved = { define: window.define, module: window.module, defineProperty: Object.defineProperty };
    window.define = window.module = undefined;
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    document.documentElement.appendChild(frame);
    window.__axeFrame = frame;
    Object.defineProperty = frame.contentWindow.Object.defineProperty;
  });
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSource });
  return page.evaluate(async tags => {
    try {
      const results = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
      return results.violations.map(violation => `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`);
    } finally {
      Object.defineProperty = window.__axeSaved.defineProperty;
      window.define = window.__axeSaved.define;
      window.module = window.__axeSaved.module;
      window.__axeFrame.remove();
    }
  }, WCAG);
}

async function openEditor(page, example = 'breakout') {
  await page.goto(`/build/?open=examples%2F${example}.ist`);
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: /^Edit/ }).press('Enter');
  const editor = await popup;
  await expect(editor.locator('#obj_nav > .col')).toHaveCount(1);
  return editor;
}

const column = (editor, index) => editor.locator('#obj_nav > .col').nth(index);
// A field's name, which is the button for the field
const field = (column, name) => column.locator('.prop_label').filter({ hasText: new RegExp(`^${name}$`) });
// The row of a field in `column`
const row = (editor, column, name) => column.locator('tr.child').filter({ has: field(editor, name) });
const fieldNames = column => column.locator('tr.child .prop_label').allInnerTexts();
const focused = editor => editor.evaluate(() => {
  const element = document.activeElement;
  return element && element !== document.body ? element.getAttribute('aria-label') || element.textContent.trim() : '';
});
// Opens the menu of the focused control and chooses an item from it, using only the keyboard
async function chooseFromMenu(editor, scope, item) {
  await editor.keyboard.press('Shift+F10');
  const menu = editor.locator(scope).locator('[role="menu"]');
  await expect(menu).toHaveCount(1);
  const items = menu.locator('[role^="menuitem"]');
  await expect(items.first()).toBeFocused();
  const names = await items.allInnerTexts();
  const index = names.findIndex(name => name.trim().startsWith(item));
  expect(index, `"${item}" in ${JSON.stringify(names)}`).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < index; i++) await editor.keyboard.press('ArrowDown');
  await expect(items.nth(index)).toBeFocused();
  await editor.keyboard.press('Enter');
}

async function openGame(editor) {
  await field(column(editor, 0), 'game').focus();
  await editor.keyboard.press('Enter');
  // Focus moves into the column that opened
  await expect(editor.locator('#obj_nav > .col')).toHaveCount(2);
  const game = column(editor, 1);
  await expect(game.locator('.obj_name_label')).toBeFocused();
  await expect(game.locator('.statechart text[aria-label^="State init"]')).toHaveCount(1);
  return game;
}

test.describe('WCAG 2.2 AA', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'axe results do not depend on the engine');

  test('the homepage, runtime, and tutorial pass axe', async ({ context }) => {
    test.setTimeout(180000);
    await context.route('https://www.youtube.com/**', route => route.abort());
    const page = await context.newPage();
    for (const path of ['/', '/breakout/', '/build/?open=examples%2Fbreakout.ist', '/build/?open=examples%2Fmap.ist']) {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
      expect(await wcagViolations(page), path).toEqual([]);
    }
    await page.goto('/build/tutorial/');
    const popup = page.waitForEvent('popup');
    await page.getByRole('button', { name: /^Edit/ }).press('Enter');
    const tutorial = await popup;
    await expect(tutorial.getByRole('region', { name: 'Tutorial step' })).toContainText('This tutorial will teach you');
    for (let step = 1; ; step++) {
      expect(await wcagViolations(tutorial), `tutorial step ${step}`).toEqual([]);
      if (step === 2) expect(await wcagViolations(page), 'tutorial runtime, step 2').toEqual([]);
      const next = tutorial.getByRole('button', { name: 'Next step' });
      if (await next.count() === 0) break;
      const text = await tutorial.getByRole('region', { name: 'Tutorial step' }).innerText();
      await next.press('Enter');
      await expect(tutorial.getByRole('region', { name: 'Tutorial step' })).not.toHaveText(text);
    }
  });

  test('the editor passes axe as it is used', async ({ page }) => {
    test.setTimeout(120000);
    const editor = await openEditor(page);
    expect(await wcagViolations(editor), 'root object').toEqual([]);
    const game = await openGame(editor);
    expect(await wcagViolations(editor), 'object with a statechart').toEqual([]);
    await field(game, 'ball').focus();
    await editor.keyboard.press('Enter');
    await expect(editor.locator('#obj_nav > .col')).toHaveCount(3);
    expect(await wcagViolations(editor), 'object with copies and inherited fields').toEqual([]);
    await field(game, 'rows').focus();
    await editor.keyboard.press('Shift+F10');
    await expect(game.getByRole('menu')).toBeVisible();
    expect(await wcagViolations(editor), "a field's menu").toEqual([]);
    await editor.keyboard.press('Escape');
    await editor.getByRole('button', { name: 'Keyboard', exact: true }).press('Enter');
    await editor.getByRole('button', { name: 'Files', exact: true }).press('Enter');
    await expect(editor.getByRole('region', { name: 'Keyboard shortcuts' })).toBeVisible();
    await expect(editor.locator('.component_list')).toBeVisible();
    expect(await wcagViolations(editor), 'keyboard shortcuts and files').toEqual([]);
    await editor.keyboard.press('Escape');
    await editor.keyboard.press('Escape');
    await column(editor, 2).locator('span.cell').first().focus();
    await editor.keyboard.press('Enter');
    await expect(editor.getByRole('textbox', { name: 'Expression', exact: true })).toBeFocused();
    expect(await wcagViolations(editor), 'editing a cell').toEqual([]);
  });
});

test.describe('keyboard', () => {
  test.describe.configure({ timeout: 90000 });

  test('Tab reaches the toolbar, objects, and fields, and Enter opens an object', async ({ page }) => {
    const editor = await openEditor(page);
    const names = [];
    for (let i = 0; i < 5; i++) {
      await editor.keyboard.press('Tab');
      names.push(await focused(editor));
    }
    // (Undo and Redo are disabled until there's something to undo)
    expect(names).toEqual(['Keyboard', 'Files', 'sketch', 'Add Field', 'slider: object']);
    await expect(editor.getByRole('region', { name: 'Keyboard shortcuts' })).toBeHidden();
    await openGame(editor);
    // The statechart comes next: its states and transitions, then adding a state
    await editor.keyboard.press('Tab');
    expect(await focused(editor)).toBe('Own states');
    await editor.keyboard.press('Tab');
    expect(await focused(editor)).toBe('Start state');
    await editor.keyboard.press('Tab');
    expect(await focused(editor)).toBe('State init (active)');
  });

  test('cells can be edited, and edits undone', async ({ page }) => {
    const editor = await openEditor(page);
    const game = await openGame(editor);
    const cell = name => game.locator(`span.cell[aria-label="num_balls in state init: ${name}"]`);
    await cell('not set').focus();
    await editor.keyboard.press('Enter');
    const expression = editor.getByRole('textbox', { name: 'Expression', exact: true });
    await expect(expression).toBeFocused();
    await editor.keyboard.type('5');
    await editor.keyboard.press('Enter');
    // Focus goes back to the cell, whose name changes once the value is set
    await expect(cell('5 (active)')).toBeFocused();
    await editor.keyboard.press('Control+z');
    await expect(cell('not set')).toBeFocused();
  });

  test("a field's menu moves, renames, and pins it", async ({ page }) => {
    const editor = await openEditor(page);
    const game = await openGame(editor);
    await field(game, 'rows').focus();
    await editor.keyboard.press('Shift+F10');
    await expect(game.getByRole('menuitem').first()).toBeFocused();
    await editor.keyboard.press('Escape');
    await expect(game.getByRole('menu')).toHaveCount(0);
    await expect(field(game, 'rows')).toBeFocused();

    const before = await fieldNames(game);
    await chooseFromMenu(editor, '#obj_nav', 'Move up');
    const at = before.indexOf('rows');
    await expect.poll(() => fieldNames(game)).toEqual([...before.slice(0, at - 1), 'rows', before[at - 1], ...before.slice(at + 1)]);
    await expect(field(game, 'rows')).toBeFocused();
    await chooseFromMenu(editor, '#obj_nav', 'Move down');
    await expect.poll(() => fieldNames(game)).toEqual(before);
    await expect(field(game, 'rows')).toBeFocused();

    // (Other expressions use rows: renaming it used to freeze the editor)
    await chooseFromMenu(editor, '#obj_nav', 'Rename');
    const name = game.getByRole('textbox', { name: 'Field name' });
    await expect(name).toBeFocused();
    await name.fill('row_count');
    await editor.keyboard.press('Enter');
    await expect(field(game, 'row_count')).toBeFocused();
    await expect(field(game, 'rows')).toHaveCount(0);

    await field(game, 'ball').focus();
    await chooseFromMenu(editor, '#obj_nav', 'Pin');
    // (ball has copies, so its heading says which one it shows)
    await expect(editor.locator('#pinned .col .obj_name_label')).toHaveText([/^ball/]);
    await editor.locator('#pinned .col').getByRole('button', { name: 'Close' }).press('Enter');
    await expect(editor.locator('#pinned .col')).toHaveCount(0);
  });

  test('statecharts can be edited', async ({ page }) => {
    const editor = await openEditor(page);
    const game = await openGame(editor);
    const states = game.locator('.statechart text[aria-label^="State "]');
    const transitions = game.locator('.statechart text[aria-label^="Transition"]');
    await expect(states).toHaveCount(3);
    const transitionCount = await transitions.count();

    await game.getByRole('button', { name: 'Add state' }).press('Enter');
    await expect(states).toHaveCount(4);
    await expect(game.getByRole('button', { name: 'Add state' })).toBeFocused();

    const over = game.locator('.statechart text[aria-label="State over"]');
    await over.focus();
    await editor.keyboard.press('Enter');
    const stateName = editor.getByRole('textbox', { name: 'State name' });
    await expect(stateName).toBeFocused();
    await stateName.fill('game_over_screen');
    await editor.keyboard.press('Enter');
    await expect(game.locator('.statechart text[aria-label="State game_over_screen"]')).toBeFocused();

    // Add a transition: choose "Add transition" from a state's menu, then choose where it goes
    await game.locator('.statechart text[aria-label^="State advance"]').focus();
    await chooseFromMenu(editor, '.statechart', 'Add transition');
    await expect(game.locator('.statechart text[aria-label^="Choose "]')).toHaveCount(4);
    await expect(game.locator('.statechart text[aria-label^="Choose "]').first()).toBeFocused();
    await game.locator('.statechart text[aria-label="Choose game_over_screen"]').focus();
    await editor.keyboard.press('Enter');
    await expect(transitions).toHaveCount(transitionCount + 1);
    await expect(game.locator('.statechart text[aria-label^="Choose "]')).toHaveCount(0);

    // Escape leaves choosing a state
    await game.locator('.statechart text[aria-label^="State init"]').focus();
    await chooseFromMenu(editor, '.statechart', 'Add transition');
    await editor.keyboard.press('Escape');
    await expect(game.locator('.statechart text[aria-label^="Choose "]')).toHaveCount(0);
    await expect(game.locator('.statechart text[aria-label^="State init"]')).toBeFocused();
    await expect(transitions).toHaveCount(transitionCount + 1);
  });

  test('objects can be saved as components and added to others', async ({ page }) => {
    const editor = await openEditor(page, 'drag_lock');
    const sketch = column(editor, 0);
    await field(sketch, 'paper').focus();
    await editor.keyboard.press('Enter');
    const paper = column(editor, 1);
    await expect(paper.locator('.obj_name_label')).toHaveText('paper');
    await field(paper, 'draggable').focus();
    await chooseFromMenu(editor, '#obj_nav', 'Save as component');

    // Add it to sketch, which becomes the open object when its column is chosen
    await sketch.locator('.obj_name_label').press('Enter');
    await expect(editor.locator('#obj_nav > .col')).toHaveCount(1);
    expect(await fieldNames(sketch)).not.toContain('draggable');
    const files = editor.getByRole('button', { name: 'Files', exact: true });
    await files.press('Enter');
    await expect(files).toHaveAttribute('aria-expanded', 'true');
    const component = editor.locator('.component_list .components').getByRole('button', { name: 'draggable', exact: true });
    await component.focus();
    await chooseFromMenu(editor, '.component_list', 'Add to sketch');
    await expect.poll(() => fieldNames(sketch)).toContain('draggable');
    await expect(component).toBeFocused();
    await editor.keyboard.press('Escape');
    await expect(editor.locator('.component_list')).toHaveCount(0);
    await expect(files).toBeFocused();
  });
});

test('tooltips stay open while hovered and close with Escape', async ({ page }) => {
  const editor = await openEditor(page);
  const game = await openGame(editor);
  const cell = row(editor, game, 'height').locator('span.cell').first();
  await cell.hover();
  const tooltip = editor.getByRole('tooltip');
  await expect(tooltip).toHaveText(/^Math\.min/);
  const box = await tooltip.boundingBox();
  await editor.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await editor.waitForTimeout(300);
  await expect(tooltip).toHaveText(/^Math\.min/);
  // Escape closes it, wherever focus is
  await cell.hover();
  await expect(tooltip).toHaveText(/^Math\.min/);
  await editor.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
});
