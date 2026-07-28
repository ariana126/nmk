import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ACCESS_TOKEN_STORAGE_KEY } from '../../core/identity/access-token-storage-key';
import { SessionStore } from '../../core/identity/session-store';
import { SiteHeader } from './site-header';

@Component({ template: '<p>stub</p>' })
class StubPage {}

describe('SiteHeader', () => {
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: StubPage },
          { path: 'login', component: StubPage },
          { path: 'sign-up', component: StubPage },
          { path: 'profile', component: StubPage },
        ]),
      ],
    });

    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  async function renderHeader(): Promise<ComponentFixture<SiteHeader>> {
    const fixture = TestBed.createComponent(SiteHeader);
    await fixture.whenStable();

    return fixture;
  }

  function linkLabels(fixture: ComponentFixture<SiteHeader>): string[] {
    return [...fixture.nativeElement.querySelectorAll('nav a, nav button')].map((element) =>
      (element as HTMLElement).textContent!.trim(),
    );
  }

  it('names the navigation, so a screen reader can tell it from any other nav', async () => {
    const nav = (await renderHeader()).nativeElement.querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Main');
  });

  describe('when nobody is signed in', () => {
    it('offers the two ways in and nothing else', async () => {
      const labels = linkLabels(await renderHeader());

      expect(labels).toContain('Log in');
      expect(labels).toContain('Create an account');
      expect(labels).not.toContain('Log out');
      expect(labels).not.toContain('Profile');
    });
  });

  describe('when someone is signed in', () => {
    beforeEach(() => {
      session.store('a-valid-token');
    });

    it('offers the profile and a way out', async () => {
      const labels = linkLabels(await renderHeader());

      expect(labels).toContain('Profile');
      expect(labels).toContain('Log out');
      expect(labels).not.toContain('Log in');
    });

    it('gives the log out control an explicit type, so it never submits a form around it', async () => {
      const logOut = (await renderHeader()).nativeElement.querySelector('nav button');

      expect(logOut?.getAttribute('type')).toBe('button');
    });

    it('clears the session and returns home when logging out', async () => {
      const fixture = await renderHeader();

      fixture.nativeElement.querySelector('nav button')!.click();
      await fixture.whenStable();

      expect(session.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
      expect(router.url).toBe('/');
    });

    it('swaps back to the signed-out controls once logged out', async () => {
      const fixture = await renderHeader();

      fixture.nativeElement.querySelector('nav button')!.click();
      await fixture.whenStable();

      expect(linkLabels(fixture)).toContain('Log in');
    });
  });
});
