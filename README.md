# Interstate

A live editor for creating interactive web applications.

## Run locally

Use Node.js 24 LTS (Node.js 22 is also tested). No Ruby, native Sass compiler,
Grunt installation, or third-party CDN is needed.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:8000 for the project homepage, choose **Open Editor**,
then click **edit** to open the editor. Allow the
editor popup if your browser prompts. Programs are saved in the browser's local
storage; use the editor's export feature for backups. Keep the same site origin
to retain access to existing saved programs.

`PORT` and `HOST` configure the server. For containers or access from another
computer, use `HOST=0.0.0.0 npm start`. `npm run dev` additionally enables the
legacy test pages. Re-run the build after source changes.

## Verify changes

```sh
npm ci
npx playwright install chromium firefox webkit
npm test
```

The checks rebuild the site, exercise HTTP routes, open the runtime and popup
editor in Chromium, Firefox, and WebKit, verify saving/reloading and remote session reconnection,
exercise all four examples, and run the legacy QUnit suite. Example checks fail
on console errors as well as uncaught exceptions and failed asset requests. They
cover dragging/releasing/locking, all carousel selections and timed advancement,
Breakout mouse/keyboard controls and scoring, map pan/pinch gestures, and viewport
size. Chromium additionally checks native touchscreen input and page scrolling. Static-host checks
serve only `.build/` under a subdirectory and verify both editor popups and
tutorial navigation. Linux machines may need `npx playwright install --with-deps chromium firefox webkit`.
The old heap-snapshot tests require their original browser extension for actual
memory-leak measurement; without it, they only exercise the functional paths.

GitHub Actions runs checks on pushes, pull requests, and weekly on Node 22 and
24. Successful Node 24 runs publish an `interstate-site` artifact.
Pushes to `master` and manual runs on `master` deploy that exact artifact to
[GitHub Pages](https://interstate.from.so/) only after both Node versions
pass all three browser engines. Failed checks leave the previous site deployed. Dependabot
proposes dependency updates; merge them only after checks pass. Exact versions
and `package-lock.json` make installs repeatable. Vendored browser libraries
remain checked in for compatibility and need deliberate, tested updates.

`src/_vendor/constraintjs/` holds ConstraintJS 0.10.1 unmodified: `cjs.js` is its
`dist/constraintjs.global.js` (without its source map comment, since the build
concatenates it) and `cjs.min.js` is `dist/constraintjs.global.min.js`. Since
0.10.1, ConstraintJS itself guards against re-entering a getter while it is
constructing its value; a regression check covers this. Runtime regression
checks also cover DOM event batching
and non-bubbling events. SVG child lists deduplicate aliases so cyclic links
between carousel thumbnails cannot repeatedly remove/reinsert the same node and
cancel native clicks. The carousel test checks that timer updates leave those
nodes in place. The Breakout sample initializes its position before
following physics coordinates; moving those expressions back to its initial
state creates a circular dependency. Its dead state also clears coordinates before
removing the physics prototype. The carousel keeps a fallback selection during
state changes, and the map uses reactive viewport dimensions and finite coordinates
after touch release. Preserve these sample fixes when replacing saved `.ist` files.

Breakout now starts in mouse mode with a matching checkbox, displays game over
when the last ball is lost and provides a native Restart button, and advances levels in a separate
state before resetting bricks. Its score counts cleared bricks, including the
last brick of a level. Example canvases adapt to narrow and short windows; the
touch overlay uses viewport dimensions instead of feeding its own overflow back
into its size. Map gestures also handle cancellation.

The interaction suite checks actual physics collisions, level progression,
repeated losses/restarts, mouse/keyboard switching, carousel selection and
advancement, drag locking, map pan/pinch/cancellation, and repeated viewport
resizing (320×480 through 1280×720). Teardown tests check timer cancellation,
deferred transition callbacks, and physics/collision cleanup. Template charts
must stay inert but cached: repeatedly discarding them causes an infinite
reconstruction loop when the number of copies changes.

## Browser support

The automated suite covers the current Chromium, Firefox, and WebKit engines,
including the runtime, popup editor, saving, examples, and tutorial. These cover
the engines used by Chrome/Edge, Firefox, and Safari. WebKit automation is not
an actual Safari installation. Old browsers and every browser/device combination
cannot be guaranteed; keep the browser tests and Playwright updates passing to
catch compatibility regressions.

## Deploy

GitHub Pages must use **GitHub Actions** as its publishing source. The workflow
in `.github/workflows/ci.yml` publishes `.build/` to https://interstate.from.so/
(https://soney.github.io/interstate/ redirects there). The custom domain is set in
the repository's Pages settings, since GitHub ignores CNAME files in sites that
Actions publish; `site/CNAME` records it in the published site, and DNS points
`interstate.from.so` at `soney.github.io`. The old `gh-pages` branch is no
longer the publishing source. To roll back, revert the faulty source commit on
`master` and let the checks and deployment run again.

`npm run build` produces the complete static site in `.build/`. The project
homepage and public navigation live in `site/`; the runtime is published at
`build/`, preserving the historical `build/index.html?open=...`, `breakout/`,
`drag_lock/`, `image_carousel/`, and `touch_map/` links. Do not replace the public
homepage with the runtime's intentionally empty canvas. Root editor/tutorial
assets remain available for links shared during the earlier deployment. Upload its
**contents** to an HTTPS static host; do not serve the repository or `dist/`
directly. All core scripts, CSS, and fonts are local, so HTTPS pages work without
CDN access. Example projects can still reference external content.

For a Node host, run `npm ci && npm run build`, then `npm start` under the host's
process supervisor. Set `HOST=0.0.0.0` and the host-provided `PORT`, terminate
HTTPS at the proxy, and forward WebSocket connections if using remote editing.
`/healthz` is available for health monitoring. The runtime defaults to a local
popup editor on all devices, which also works on static hosting. Remote editing
via Socket.IO requires the Node server and an explicitly configured external
editor; it is not an authenticated collaboration service.

The optional `DEPLOY_TARGET=user@host:/path/ ./upload.sh` runs installation and
all tests before copying the build. Prefer your host's atomic release mechanism
for deployments that must not expose a partially uploaded release. Retain the
previous build for rollback.

To serve `interstate.from.so` from another host, point its DNS record there
instead; repository changes cannot repair missing DNS records.
After deployment, check the public HTTPS URL and editor popup, then configure
an uptime monitor against that URL (or `/healthz` on a Node host).

Contact: [Stephen Oney](https://from.so/) ([soney@cmu.edu](mailto:soney@cmu.edu)).
