import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IdentityGateway, MissingAccessTokenError } from './identity-gateway';
import { SessionStore } from './session-store';

describe('IdentityGateway', () => {
  let gateway: IdentityGateway;
  let httpMock: HttpTestingController;
  let session: SessionStore;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    gateway = TestBed.inject(IdentityGateway);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('signUp', () => {
    it('posts exactly the four fields the API accepts, and nothing else', async () => {
      // The backend's ValidationPipe runs `forbidNonWhitelisted`, so a fifth property is a 400.
      // This assertion is what pins that down — a `confirmPassword` leaking through here would fail.
      const signingUp = gateway.signUp({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
        firstName: 'Ariana',
        lastName: 'Doe',
      });

      const request = httpMock.expectOne('/api/users');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
        firstName: 'Ariana',
        lastName: 'Doe',
      });

      request.flush(null, { status: 201, statusText: 'Created' });
      await expect(signingUp).resolves.toBeUndefined();
    });

    it('resolves on a 201 with an empty body rather than choking on the absent value', async () => {
      const signingUp = gateway.signUp({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
        firstName: 'Ariana',
        lastName: 'Doe',
      });

      httpMock.expectOne('/api/users').flush(null, { status: 201, statusText: 'Created' });

      await expect(signingUp).resolves.toBeUndefined();
    });

    it('does not log the user in — registering and authenticating are separate calls', async () => {
      const signingUp = gateway.signUp({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
        firstName: 'Ariana',
        lastName: 'Doe',
      });
      httpMock.expectOne('/api/users').flush(null, { status: 201, statusText: 'Created' });
      await signingUp;

      expect(session.isAuthenticated()).toBe(false);
    });
  });

  describe('logIn', () => {
    it('posts the credentials and stores the token it gets back', async () => {
      const loggingIn = gateway.logIn({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
      });

      const request = httpMock.expectOne('/api/auth/login');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
      });

      request.flush({ accessToken: 'a-fresh-token' });
      await loggingIn;

      expect(session.accessToken()).toBe('a-fresh-token');
      expect(session.isAuthenticated()).toBe(true);
    });

    it('rejects and stores nothing when a 200 carries no token', async () => {
      const loggingIn = gateway.logIn({ email: 'ariana@example.com', password: 'whatever12345' });

      httpMock.expectOne('/api/auth/login').flush({});

      await expect(loggingIn).rejects.toBeInstanceOf(MissingAccessTokenError);
      expect(session.isAuthenticated()).toBe(false);
    });

    it('leaves the session alone when the credentials are rejected', async () => {
      const loggingIn = gateway.logIn({ email: 'ariana@example.com', password: 'wrong-one-12345' });

      httpMock
        .expectOne('/api/auth/login')
        .flush(
          { type: 'https://my-api-doc.dev/problems/invalid-credentials' },
          { status: 401, statusText: 'Unauthorized' },
        );

      await expect(loggingIn).rejects.toBeDefined();
      expect(session.isAuthenticated()).toBe(false);
    });
  });

  describe('profile', () => {
    it('maps the response into four guaranteed strings', async () => {
      const profile = firstEmission(gateway.profile());

      httpMock.expectOne('/api/users/me').flush({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'ariana@example.com',
        firstName: 'Ariana',
        lastName: 'Doe',
      });

      await expect(profile).resolves.toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'ariana@example.com',
        firstName: 'Ariana',
        lastName: 'Doe',
      });
    });

    it('turns the empty response the contract permits into empty strings, never undefined', async () => {
      const profile = firstEmission(gateway.profile());

      httpMock.expectOne('/api/users/me').flush({});

      await expect(profile).resolves.toEqual({ id: '', email: '', firstName: '', lastName: '' });
    });
  });

  describe('logOut', () => {
    it('clears the session without calling the API — the token is only ever held here', () => {
      session.store('a-fresh-token');

      gateway.logOut();

      expect(session.isAuthenticated()).toBe(false);
      httpMock.verify();
    });
  });
});

/** Promise for the first value of an Observable, without pulling `firstValueFrom` into the test. */
function firstEmission<T>(source: import('rxjs').Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    source.subscribe({ next: resolve, error: reject });
  });
}
