'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sass = require('sass');
const { minify } = require('terser');
const libs = require('../include_libs');
const pkg = require('../package.json');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.build');

async function build() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'dist'), output, { recursive: true });
  // Ship the same checked-in libraries used by the development and test pages.
  fs.cpSync(path.join(root, 'src/_vendor'), path.join(output, 'vendor'), { recursive: true });
  fs.cpSync(path.join(root, 'src/view/editor/style'), path.join(output, 'editor/style'), { recursive: true });
  for (const name of ['editor_style', 'runtime_style']) {
    const result = sass.compile(path.join(root, `src/view/editor/style/${name}.scss`));
    fs.writeFileSync(path.join(output, `editor/style/${name}.css`), result.css);
  }
  const files = [...libs.runtime, ...libs.editor].filter(file => file.endsWith('.js'));
  const sources = {};
  for (const file of files) {
    sources[file] = fs.readFileSync(path.join(root, file), 'utf8')
      .replace('<%= version %>', pkg.version)
      .replace('<%= build_time %>', new Date(Number(process.env.SOURCE_DATE_EPOCH || Date.now() / 1000) * 1000).toISOString());
  }
  fs.writeFileSync(path.join(output, 'interstate.js'), Object.values(sources).join('\n;\n'));
  const result = await minify(sources, {
    // Legacy code uses function names for serialization; preserve them.
    keep_fnames: true,
    sourceMap: { filename: 'interstate.min.js', url: 'interstate.min.js.map', includeSources: true }
  });
  fs.writeFileSync(path.join(output, 'interstate.min.js'), result.code);
  fs.writeFileSync(path.join(output, 'interstate.min.js.map'), result.map);
  console.log('Built self-contained site in .build/');
}

build().catch(error => { console.error(error); process.exitCode = 1; });
