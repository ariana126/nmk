import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import type { Result } from 'axe-core';

import { ACCESS_TOKEN_STORAGE_KEY } from '../src/app/core/identity/access-token-storage-key';

/**
 * Every route the audit visits, split by whether reaching it needs a session.
 *
 * **Add a path to one of these lists whenever you add a route** — a page missing from them is a page
 * nothing checks. This is the one manual step the gate depends on.
 */
const publicRoutes = [
  '/',
  '/sign-up',
  '/login',
  '/forgot-password',
  // Deliberately without a `?token=`. The audit grades a route in its initial state, and the state
  // a bare visit lands in is the one this page has to render sensibly — which is what makes the
  // "no token" branch the branch worth grading here.
  '/reset-password',
  '/no-such-page',
];
const authenticatedRoutes = ['/profile'];

/**
 * The rules the gate enforces: every axe rule that maps to a WCAG A or AA success criterion,
 * and nothing else. `best-practice` is excluded because its rules (`region`,
 * `page-has-heading-one`, `heading-order`) are editorial rather than normative, and AAA and
 * `experimental` because they exceed the AA bar this project sets — an axe upgrade that adds
 * an experimental rule must not turn CI red on its own.
 *
 * Note what a green run does not prove: axe detects roughly a third of WCAG failures. See the
 * accessibility section of ../CLAUDE.md for the review checklist covering the rest. In particular
 * a form's *error* state is not reachable by navigation, so nothing here grades it.
 */
const wcagAaTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** A count tells you nothing. Print the rule, why it matters, and which elements broke it. */
function describeViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const elements = violation.nodes
        .map((node) => `      ${node.target.join(' ')}\n        ${node.failureSummary}`)
        .join('\n');

      return [
        `  ${violation.id} (${violation.impact}) — ${violation.help}`,
        `    ${violation.helpUrl}`,
        elements,
      ].join('\n');
    })
    .join('\n\n');
}

async function auditRoute(page: Page, route: string): Promise<void> {
  await page.goto(route);
  // `goto` resolves on load, but Angular renders after it. Without this the audit would
  // grade an empty <app-root> and pass without having looked at anything.
  await expect(page.locator('app-root')).not.toBeEmpty();

  const { violations } = await new AxeBuilder({ page }).withTags(wcagAaTags).analyze();

  // Assert on the rule ids, not the violation objects: the diff stays one line per broken
  // rule instead of a hundred lines of axe's JSON, and the detail is in the message above it.
  expect(
    violations.map((violation) => violation.id),
    `\n${describeViolations(violations)}\n`,
  ).toEqual([]);
}

for (const route of publicRoutes) {
  test(`${route} has no WCAG A or AA accessibility violations`, async ({ page }) => {
    await auditRoute(page, route);
  });
}

test.describe('behind the auth guard', () => {
  test.beforeEach(async ({ page }) => {
    // `addInitScript`, not `evaluate`: this has to run before any page script on every navigation,
    // because SessionStore reads the key as it is constructed and the guard redirects on the very
    // first one. Writing the key after `goto` would already be too late.
    await page.addInitScript(
      ([key, token]) => window.localStorage.setItem(key, token),
      [ACCESS_TOKEN_STORAGE_KEY, 'accessibility-audit-token'],
    );

    // Fulfilled inside the browser, upstream of the dev server's proxy, so the audit never reaches
    // the backend. This gate grades rendered markup and computed style; making the one check that
    // needs a browser *also* need a migrated database and a seeded user would cost determinism and
    // buy nothing. The trade-off is that it proves the page's markup is accessible, not that some
    // particular real payload is.
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'audit@example.test',
          firstName: 'Audit',
          lastName: 'User',
        }),
      }),
    );
  });

  for (const route of authenticatedRoutes) {
    test(`${route} has no WCAG A or AA accessibility violations`, async ({ page }) => {
      await auditRoute(page, route);
    });
  }
});
