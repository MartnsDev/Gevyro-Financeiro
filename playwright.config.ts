import { defineConfig } from '@playwright/test';
// Keep host desktop-library overrides and credentials out of WebKit's isolated process.
const webkitEnv = Object.fromEntries(
  ['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'XDG_RUNTIME_DIR', 'DISPLAY', 'LANG', 'TZ'].flatMap(
    (key) => (process.env[key] !== undefined ? [[key, process.env[key]!]] : []),
  ),
);
export default defineConfig({
  testDir: './tests/responsive',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 7000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: '.openai/local/responsive-results',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4178',
    headless: true,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node scripts/serve-responsive.mjs',
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects:
    process.env.GEVYRO_TEST_BROWSERS === 'all'
      ? [
          {
            name: 'chromium',
            use: {
              browserName: 'chromium',
              channel: process.env.GEVYRO_TEST_CHROME === 'system' ? 'chrome' : undefined,
            },
          },
          { name: 'firefox', use: { browserName: 'firefox' } },
          { name: 'webkit', use: { browserName: 'webkit', launchOptions: { env: webkitEnv } } },
        ]
      : [
          {
            name: 'chromium',
            use: {
              browserName: 'chromium',
              channel: process.env.GEVYRO_TEST_CHROME === 'system' ? 'chrome' : undefined,
            },
          },
        ],
});
