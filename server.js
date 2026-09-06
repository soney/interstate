#!/usr/bin/env node
'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const ejs = require('ejs');
const { Server } = require('socket.io');
const libs = require('./include_libs');
const root = __dirname;

function createServer({ development = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  app.get('/e/:uid', (req, res) => res.redirect(
    '/src/view/editor/editor.ejs.html?comm=socket&client_id=' + encodeURIComponent(req.params.uid)
  ));
  // Only render known templates, never arbitrary request-supplied filesystem paths.
  app.get(/\.ejs\.html$/, async (req, res, next) => {
    const file = req.path.slice(1);
    const allowed = file === 'index.ejs.html' || file === 'src/view/editor/editor.ejs.html' ||
      (development && /^test\/(?:unit_tests\/unit_tests|same_window|remote_statechart)\.ejs\.html$/.test(file));
    if (!allowed) return res.sendStatus(404);
    try {
      const prefix = '../'.repeat(file.split('/').length - 1);
      const body = ejs.render(await fs.readFile(path.join(root, file), 'utf8'), {
        ist_inc: libs,
        ist_include: (files, ignoreCss) => libs.include_templates(files.map(file => prefix + file), ignoreCss),
        addr: 'localhost'
      });
      res.type('html').send(body);
    } catch (error) { next(error); }
  });
  app.use('/src/view/editor/style', express.static(path.join(root, '.build/editor/style')));
  app.use('/src', express.static(path.join(root, 'src')));
  if (development) app.use('/test', express.static(path.join(root, 'test')));
  app.use(express.static(path.join(root, '.build')));
  app.use((req, res) => res.sendStatus(404));
  const server = http.createServer(app);
  const io = new Server(server);
  io.on('connection', socket => {
    socket.on('comm_wrapper', (clientId, isServer, acknowledge) => {
      if (typeof clientId !== 'string' || !clientId || clientId.length > 256) return;
      if (socket.data.clientId) socket.leave(socket.data.clientId);
      socket.data.clientId = clientId;
      socket.join(clientId);
      if (typeof acknowledge === 'function') acknowledge();
    });
    socket.on('message', message => {
      if (message && message.client_id === socket.data.clientId && socket.data.clientId) {
        socket.to(socket.data.clientId).emit('message', message);
      }
    });
  });
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8000);
  const host = process.env.HOST || '127.0.0.1';
  fs.access(path.join(root, '.build/index.html')).then(() => {
    const server = createServer({ development: process.argv.includes('--dev') });
    server.listen(port, host, () => console.log(`InterState running at http://${host}:${server.address().port}`));
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
  }).catch(() => { console.error('Build missing. Run npm run build before npm start.'); process.exitCode = 1; });
}
module.exports = { createServer };
