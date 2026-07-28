import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PROBLEM } from '../../../core/http/problem-details';
import { SessionStore } from '../../../core/identity/session-store';
import { LoginPage } from './login-page';

@Component({ template: '<p>stub</p>' })
class StubPage {}

describe('LoginPage', () => {
  let httpMock: HttpTestingController;
  let session: SessionStore;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [
            { path: 'login', component: LoginPage },
            { path: 'profile', component: StubPage },
            { path: 'sign-up', component: StubPage },
            { path: 'settings', component: StubPage },
          ],
          withComponentInputBinding(),
        ),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function openLogin(query = ''): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create(`/login${query}`);

    return harness.routeNativeElement as HTMLElement;
  }

  function control(page: HTMLElement, id: string): HTMLInputElement {
    return page.querySelector<HTMLInputElement>(`#${id}`)!;
  }

  async function fillIn(page: HTMLElement, id: string, value: string): Promise<void> {
    const input = control(page, id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  /**
   * Submitting is a promise chain — the response resolves the gateway call, then submission errors
   * are applied and any navigation runs. A single stabilisation only covers the first link, so let
   * the macrotask queue drain in between.
   */
  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }

  async function submitForm(page: HTMLElement): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  async function logInWith(email: string, password: string): Promise<HTMLElement> {
    const page = await openLogin();
    await fillIn(page, 'email', email);
    await fillIn(page, 'password', password);
    await submitForm(page);

    return page;
  }

  /** The text of the element the control's aria-describedby points at. */
  function describedText(page: HTMLElement, id: string): string {
    const describedBy = control(page, id).getAttribute('aria-describedby');

    return describedBy === null ? '' : (page.querySelector(`#${describedBy}`)?.textContent ?? '');
  }

  describe('the form itself', () => {
    it('carries novalidate, so the browser does not pre-empt the accessible errors', async () => {
      expect((await openLogin()).querySelector('form')!.hasAttribute('novalidate')).toBe(true);
    });

    it('labels every control and tells the password manager what each one is', async () => {
      const page = await openLogin();

      for (const [id, autocomplete] of [
        ['email', 'email'],
        ['password', 'current-password'],
      ]) {
        expect(page.querySelector(`label[for="${id}"]`)).not.toBeNull();
        expect(control(page, id).getAttribute('autocomplete')).toBe(autocomplete);
      }
    });

    it('leaves aria-invalid off entirely until something is wrong', async () => {
      // Present-and-"false" is a different thing to absent; absent is what a valid field wants.
      expect(control(await openLogin(), 'email').hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('before the API is involved', () => {
    it('refuses to submit an empty form and says why, without calling the API', async () => {
      const page = await openLogin();

      await submitForm(page);

      httpMock.expectNone('/api/auth/login');
      expect(describedText(page, 'email')).toContain('Enter your email address');
      expect(describedText(page, 'password')).toContain('Enter your password');
    });

    it('marks the invalid control for assistive technology, not just visually', async () => {
      const page = await openLogin();

      await submitForm(page);

      expect(control(page, 'email').getAttribute('aria-invalid')).toBe('true');
    });

    it('moves focus to the first invalid control so the keyboard lands where the work is', async () => {
      const page = await openLogin();

      await submitForm(page);

      expect(document.activeElement).toBe(control(page, 'email'));
    });
  });

  describe('a successful login', () => {
    it('posts the credentials, stores the token and moves on to the profile', async () => {
      await logInWith('ariana@example.com', 'Str0ng-Passphrase!2026');

      const request = httpMock.expectOne('/api/auth/login');
      expect(request.request.body).toEqual({
        email: 'ariana@example.com',
        password: 'Str0ng-Passphrase!2026',
      });

      request.flush({ accessToken: 'a-fresh-token' });
      await settle();

      expect(session.accessToken()).toBe('a-fresh-token');
      expect(router.url).toBe('/profile');
    });

    it('returns to wherever the guard interrupted', async () => {
      const page = await openLogin('?returnUrl=%2Fsettings');
      await fillIn(page, 'email', 'ariana@example.com');
      await fillIn(page, 'password', 'Str0ng-Passphrase!2026');
      await submitForm(page);

      httpMock.expectOne('/api/auth/login').flush({ accessToken: 'a-fresh-token' });
      await settle();

      expect(router.url).toBe('/settings');
    });

    it.each(['//evil.example', 'https://evil.example/steal'])(
      'ignores an off-site returnUrl (%s) rather than walking the user off the origin',
      async (hostile) => {
        const page = await openLogin(`?returnUrl=${encodeURIComponent(hostile)}`);
        await fillIn(page, 'email', 'ariana@example.com');
        await fillIn(page, 'password', 'Str0ng-Passphrase!2026');
        await submitForm(page);

        httpMock.expectOne('/api/auth/login').flush({ accessToken: 'a-fresh-token' });
        await settle();

        expect(router.url).toBe('/profile');
      },
    );
  });

  describe('when the API refuses', () => {
    it('reports rejected credentials on the form, never against the email field', async () => {
      // Attributing it to a field would tell an attacker which addresses are registered.
      const page = await logInWith('ariana@example.com', 'wrong-passphrase');

      httpMock
        .expectOne('/api/auth/login')
        .flush({ type: PROBLEM.invalidCredentials }, { status: 401, statusText: 'Unauthorized' });
      await settle();

      const alert = page.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain('Email or password is incorrect');
      expect(control(page, 'email').hasAttribute('aria-invalid')).toBe(false);
    });

    it('stays put and stores nothing when the credentials are rejected', async () => {
      await logInWith('ariana@example.com', 'wrong-passphrase');

      httpMock
        .expectOne('/api/auth/login')
        .flush({ type: PROBLEM.invalidCredentials }, { status: 401, statusText: 'Unauthorized' });
      await settle();

      expect(session.isAuthenticated()).toBe(false);
      expect(router.url).toBe('/login');
    });

    it('puts a field-specific validation error under the field it belongs to', async () => {
      const page = await logInWith('ariana@example.com', 'anything-at-all');

      httpMock.expectOne('/api/auth/login').flush(
        {
          type: PROBLEM.validationError,
          errors: [{ field: 'email', message: 'email must be an email' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      await settle();

      expect(describedText(page, 'email')).toContain('Enter a valid email address');
    });

    it('shows the fallback in the alert when the connection drops', async () => {
      const page = await logInWith('ariana@example.com', 'Str0ng-Passphrase!2026');

      httpMock.expectOne('/api/auth/login').error(new ProgressEvent('error'));
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain('could not log you in');
    });

    it('focuses the alert when the failure belongs to no single field', async () => {
      const page = await logInWith('ariana@example.com', 'wrong-passphrase');

      httpMock
        .expectOne('/api/auth/login')
        .flush({ type: PROBLEM.invalidCredentials }, { status: 401, statusText: 'Unauthorized' });
      await settle();

      expect(document.activeElement).toBe(page.querySelector('#login-alert'));
    });
  });

  describe('arriving from sign-up', () => {
    it('confirms the account exists and prefills the address, so it is typed once', async () => {
      const page = await openLogin('?created=1&email=ariana%40example.com');

      expect(page.querySelector('[role="status"]')!.textContent).toContain('account is ready');
      expect(control(page, 'email').value).toBe('ariana@example.com');
    });

    it('says nothing of the sort on an ordinary visit', async () => {
      expect((await openLogin()).querySelector('[role="status"]')).toBeNull();
    });
  });
});
