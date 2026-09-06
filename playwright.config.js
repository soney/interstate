const { defineConfig } = require('@playwright/test');
const port = process.env.TEST_PORT || '8123';
module.exports = defineConfig({
  testDir: './test/browser',
  timeout: 60000,
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: {
    command: 'node server.js --dev',
    env: { PORT: port, HOST: '127.0.0.1' },
    url: `http://127.0.0.1:${port}/healthz`,
    reuseExistingServer: false
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
