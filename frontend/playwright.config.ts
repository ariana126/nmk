import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright drives the accessibility audit only — the unit tests are Vitest's, under `src/`.
 * The two never meet: `testDir` is `a11y/`, and the unit-test builder only discovers specs
 * under `src/`.
 *
 * There is no `webServer` here. Compose owns the dev server: `make lint-accessibility` starts it
 * and waits for its healthcheck, so this config only has to know where to point.
 */
export default defineConfig({
  testDir: './a11y',
  // The audit asserts on a rendered page, so a flake is a real signal — never retry it away.
  retries: 0,
  reporter: [
    ['list'],
    // Committed to CI as an artifact: a violation is far easier to read here, with the
    // offending element highlighted, than scraped out of a job log.
    ['html', { outputFolder: 'a11y/report', open: 'never' }],
  ],
  outputDir: 'a11y/.output',
  use: {
    baseURL: process.env['A11Y_BASE_URL'] ?? 'http://localhost:4200',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
