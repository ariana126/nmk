import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  async function renderPage(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(NotFoundPage);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }

  it('says what happened in a heading rather than only in an eyebrow', async () => {
    const heading = (await renderPage()).querySelector('h1');

    expect(heading?.textContent).toContain('nothing at this address');
  });

  it('offers a way back rather than leaving the visitor stranded', async () => {
    const home = (await renderPage()).querySelector('a');

    expect(home?.getAttribute('href')).toBe('/');
  });
});
