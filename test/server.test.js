'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../server');

test('production serves complete pages and keeps repository files private', async t => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const url of ['/', '/editor.html', '/tutorial/', '/interstate.min.js', '/editor/style/editor_style.css', '/src/view/editor/editor.ejs.html?comm=socket&client_id=test', '/healthz']) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200, url);
    const body = await response.text();
    assert.ok(body.length > 0, url);
    if (response.headers.get('content-type').includes('text/html')) assert.doesNotMatch(body, /<%|(?:src|href)="http:\/\//, url);
  }
  for (const url of ['/package.json', '/server.js', '/.git/config', '/test/unit_tests/unit_tests.ejs.html', '/missing.ejs.html', '/auto_open_editor']) {
    assert.equal((await fetch(base + url)).status, 404, url);
  }
  const redirect = await fetch(base + '/e/session', { redirect: 'manual' });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), '/src/view/editor/editor.ejs.html?comm=socket&client_id=session');
});
