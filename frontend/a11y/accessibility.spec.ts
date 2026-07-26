import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Result } from 'axe-core';

/**
 * Every route the audit visits. **Add a path here whenever you add a route** — a page missing
 * from this list is a page nothing checks. This is the one manual step the gate depends on.
 */
const auditedRoutes = ['/'];

/**
 * The rules the gate enforces: every axe rule that maps to a WCAG A or AA success criterion,
 * and nothing else. `best-practice` is excluded because its rules (`region`,
 * `page-has-heading-one`, `heading-order`) are editorial rather than normative, and AAA and
 * `experimental` because they exceed the AA bar this project sets — an axe upgrade that adds
 * an experimental rule must not turn CI red on its own.
 *
 * Note what a green run does not prove: axe detects roughly a third of WCAG failures. See the
 * accessibility section of ../CLAUDE.md for the review checklist covering the rest.
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

for (const route of auditedRoutes) {
  test(`${route} has no WCAG A or AA accessibility violations`, async ({ page }) => {
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
  });
}
