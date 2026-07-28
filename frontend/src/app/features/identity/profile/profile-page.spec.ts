import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { accessTokenInterceptor } from '../../../core/http/access-token-interceptor';
import { authGuard } from '../../../core/identity/auth-guard';
import { SessionStore } from '../../../core/identity/session-store';
import { ProfilePage } from './profile-page';

@Component({ template: '<p>stub</p>' })
class StubPage {}

describe('ProfilePage', () => {
  let httpMock: HttpTestingController;
  let session: SessionStore;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        // The interceptor is wired here as it is in app.config.ts, so this spec exercises the same
        // path production does — the page's request only carries a token because of it.
        provideHttpClient(withInterceptors([accessTokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
          { path: 'login', component: StubPage },
        ]),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function openProfile(): Promise<HTMLElement> {
    session.store('a-valid-token');
    harness = await RouterTestingHarness.create('/profile');

    return harness.routeNativeElement as HTMLElement;
  }

  /**
   * Let the macrotask queue drain without stabilising. `whenStable()` blocks while an `rxResource`
   * request is in flight, so anything that has to happen *between* issuing a request and answering
   * it — asserting on it, flushing it — has to wait this way instead.
   */
  async function tick(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    await tick();
    await harness.fixture.whenStable();
  }

  describe('the guard in front of it', () => {
    it('sends an anonymous visitor to log in, remembering where they were going', async () => {
      harness = await RouterTestingHarness.create('/profile');

      expect(router.url).toBe('/login?returnUrl=%2Fprofile');
    });

    it('lets a signed-in visitor through', async () => {
      await openProfile();

      httpMock.expectOne('/api/users/me').flush({ email: 'ariana@example.com' });
      await settle();

      expect(router.url).toBe('/profile');
    });
  });

  describe('while loading', () => {
    it('says so in a live region rather than showing an empty panel', async () => {
      const page = await openProfile();

      const status = page.querySelector('[role="status"]');
      expect(status?.textContent).toContain('Loading your profile');
      expect(page.querySelector('[aria-busy="true"]')).not.toBeNull();

      httpMock.expectOne('/api/users/me').flush({});
      await settle();
    });
  });

  describe('with a profile', () => {
    it('renders the name and email as a record', async () => {
      const page = await openProfile();

      httpMock.expectOne('/api/users/me').flush({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'ariana@example.com',
        firstName: 'Ariana',
        lastName: 'Doe',
      });
      await settle();

      expect(page.textContent).toContain('Ariana Doe');
      expect(page.textContent).toContain('ariana@example.com');
      expect(page.querySelectorAll('.record__row')).toHaveLength(2);
    });

    it('sends the bearer token, without which the API would refuse', async () => {
      await openProfile();

      const request = httpMock.expectOne('/api/users/me');
      expect(request.request.headers.get('Authorization')).toBe('Bearer a-valid-token');

      request.flush({});
      await settle();
    });

    it('renders only the rows it has, when the response is partial', async () => {
      const page = await openProfile();

      httpMock.expectOne('/api/users/me').flush({ email: 'ariana@example.com' });
      await settle();

      expect(page.querySelectorAll('.record__row')).toHaveLength(1);
      expect(page.textContent).toContain('ariana@example.com');
    });

    it('never renders the literal text "undefined", whatever the contract permits', async () => {
      // Every member of the response is optional in the OpenAPI spec, so `{}` is a legal answer.
      const page = await openProfile();

      httpMock.expectOne('/api/users/me').flush({});
      await settle();

      expect(page.textContent).not.toContain('undefined');
      expect(page.textContent).toContain('do not have any details');
    });
  });

  describe('when the profile cannot be loaded', () => {
    it('reports it in an alert and offers a way to retry', async () => {
      const page = await openProfile();

      httpMock
        .expectOne('/api/users/me')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain('could not load');
      expect(page.querySelector('button')?.getAttribute('type')).toBe('button');
    });

    it('asks the API again when told to retry', async () => {
      const page = await openProfile();

      httpMock
        .expectOne('/api/users/me')
        .flush(null, { status: 500, statusText: 'Internal Server Error' });
      await settle();

      page.querySelector('button')!.click();
      await tick();

      httpMock.expectOne('/api/users/me').flush({ email: 'ariana@example.com' });
      await settle();

      expect(page.textContent).toContain('ariana@example.com');
    });
  });
});
