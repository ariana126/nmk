import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionStore } from '../identity/session-store';
import { accessTokenInterceptor } from './access-token-interceptor';
import { anonymous } from './auth-context';

@Component({ template: '<p>stub</p>' })
class StubPage {}

describe('accessTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([accessTokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'profile', component: StubPage },
          { path: 'login', component: StubPage },
        ]),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('attaching the token', () => {
    it('attaches it to an API request when there is one', () => {
      session.store('a-valid-token');

      http.get('/api/users/me').subscribe();

      const request = httpMock.expectOne('/api/users/me');
      expect(request.request.headers.get('Authorization')).toBe('Bearer a-valid-token');
      request.flush({});
    });

    it('attaches nothing when the session is anonymous', () => {
      http.get('/api/users/me').subscribe();

      const request = httpMock.expectOne('/api/users/me');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });

    it('attaches nothing to a request marked anonymous, even holding a token', () => {
      // This is what keeps the token off `POST /api/auth/login` and `POST /api/users`.
      session.store('a-valid-token');

      http.post('/api/auth/login', {}, { context: anonymous() }).subscribe();

      const request = httpMock.expectOne('/api/auth/login');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({ accessToken: 'another-token' });
    });

    it('never sends the token off to a non-API URL', () => {
      session.store('a-valid-token');

      http.get('/assets/config.json').subscribe();

      const request = httpMock.expectOne('/assets/config.json');
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    });
  });

  describe('when the API rejects the token', () => {
    it('clears the session and sends the user to log in, remembering where they were', async () => {
      session.store('an-expired-token');
      const harness = await RouterTestingHarness.create('/profile');

      http.get('/api/users/me').subscribe({ error: () => undefined });
      httpMock
        .expectOne('/api/users/me')
        .flush(
          { type: 'about:blank', title: 'Unauthorized', status: 401 },
          { status: 401, statusText: 'Unauthorized' },
        );
      // The interceptor's redirect is a navigation kicked off inside an error callback; let it settle.
      await harness.fixture.whenStable();

      expect(session.isAuthenticated()).toBe(false);
      expect(router.url).toBe('/login?returnUrl=%2Fprofile');
    });

    it('leaves an anonymous request alone — a failed login must not look like an expired session', async () => {
      // A 401 from `POST /api/auth/login` means "wrong password", not "your token died". The request
      // skipped the interceptor's error handling entirely, which is why no second status check is
      // needed to tell the two apart.
      session.store('a-valid-token');
      await RouterTestingHarness.create('/profile');

      http.post('/api/auth/login', {}, { context: anonymous() }).subscribe({
        error: () => undefined,
      });
      httpMock
        .expectOne('/api/auth/login')
        .flush(
          { type: 'https://my-api-doc.dev/problems/invalid-credentials' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(session.isAuthenticated()).toBe(true);
      expect(router.url).toBe('/profile');
    });

    it('does not clear a token it never sent', () => {
      // A 401 on a request made while already anonymous has nothing to invalidate.
      http.get('/api/users/me').subscribe({ error: () => undefined });

      httpMock.expectOne('/api/users/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(session.isAuthenticated()).toBe(false);
      expect(router.url).toBe('/');
    });

    it('does not redirect to login from login, which would nest returnUrl into itself', async () => {
      session.store('an-expired-token');
      await RouterTestingHarness.create('/login');

      http.get('/api/users/me').subscribe({ error: () => undefined });
      httpMock.expectOne('/api/users/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(session.isAuthenticated()).toBe(false);
      expect(router.url).toBe('/login');
    });

    it('rethrows the failure so the caller still decides what the user sees', () => {
      session.store('an-expired-token');
      let seen: unknown;

      http.get('/api/users/me').subscribe({ error: (error: unknown) => (seen = error) });
      httpMock.expectOne('/api/users/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(seen).toBeDefined();
    });
  });
});
