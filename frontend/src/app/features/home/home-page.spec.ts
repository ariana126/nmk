import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  async function renderPage(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }

  it('leads with exactly one first-level heading', async () => {
    expect((await renderPage()).querySelectorAll('h1')).toHaveLength(1);
  });

  it('quotes the acceptance scenario, keyword and step text together', async () => {
    const steps = [...(await renderPage()).querySelectorAll('.spec__step')].map((step) =>
      step.textContent!.replace(/\s+/g, ' ').trim(),
    );

    expect(steps).toHaveLength(4);
    expect(steps[0]).toContain('Given');
    expect(steps[0]).toContain("Ariana doesn't have an account");
    expect(steps[1]).toContain('When');
    expect(steps[3]).toContain('sees his profile');
  });

  it('marks the steps as a list, so the count is announced rather than inferred', async () => {
    const list = (await renderPage()).querySelector('ol.spec__steps');

    expect(list).not.toBeNull();
    expect(list?.querySelectorAll('li')).toHaveLength(4);
  });

  it('hides the decorative verdict marks from assistive technology', async () => {
    const marks = [...(await renderPage()).querySelectorAll('.spec__mark')];

    expect(marks).toHaveLength(4);
    expect(marks.every((mark) => mark.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('routes onward to both ways of getting an account', async () => {
    const hrefs = [...(await renderPage()).querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );

    expect(hrefs).toContain('/sign-up');
    expect(hrefs).toContain('/login');
  });
});
