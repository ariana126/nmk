import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';

@Component({ template: '<p>stub</p>' })
class StubPage {}

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  async function renderShell(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }

  it('creates the app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('renders the site header', async () => {
    expect((await renderShell()).querySelector('app-site-header')).not.toBeNull();
  });

  it('renders an outlet for the routed page', async () => {
    expect((await renderShell()).querySelector('router-outlet')).not.toBeNull();
  });

  it('opens with a skip link pointing at the main landmark', async () => {
    const shell = await renderShell();
    const skipLink = shell.querySelector<HTMLAnchorElement>('a.skip-link');

    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(shell.querySelector('#main-content')).not.toBeNull();
  });

  it('places the skip link before the navigation it exists to skip', async () => {
    const shell = await renderShell();
    const skipLink = shell.querySelector('a.skip-link')!;
    const header = shell.querySelector('app-site-header')!;

    expect(skipLink.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('carries a live region for announcing navigations, silent until one happens', async () => {
    const announcer = (await renderShell()).querySelector('[role="status"]');

    expect(announcer).not.toBeNull();
    expect(announcer?.textContent?.trim()).toBe('');
  });
});

describe('App route announcements', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: StubPage, title: 'nmk' },
          { path: 'login', component: StubPage, title: 'Log in · nmk' },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('announces the page just navigated to, not the one left behind', async () => {
    // Regression: reading `document.title` here gave the *previous* page's title, because the
    // router's own TitleStrategy writes it from a NavigationEnd subscriber that runs after this one.
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');
    await fixture.whenStable();
    await router.navigateByUrl('/login');
    await fixture.whenStable();

    const announcer = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
    expect(announcer?.textContent?.trim()).toBe('Log in · nmk');
  });
});
