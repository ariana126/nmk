import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PROBLEM } from '../../../core/http/problem-details';
import { SessionStore } from '../../../core/identity/session-store';
import { ResetPasswordPage } from './reset-password-page';

@Component({ template: '<p>stub</p>' })
class StubPage {}

const TOKEN = 'a-secret-from-the-email';
const RESET_URL = `/api/password-resets/${TOKEN}/password`;
const NEW_PASSWORD = 'Str0ng-Ariana-Passphrase!2026';

describe('ResetPasswordPage', () => {
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
            { path: 'reset-password', component: ResetPasswordPage },
            { path: 'login', component: StubPage },
            { path: 'forgot-password', component: StubPage },
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

  async function openPage(query = `?token=${TOKEN}`): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create(`/reset-password${query}`);

    return harness.routeNativeElement as HTMLElement;
  }

  function control(page: HTMLElement, id: string): HTMLInputElement {
    return page.querySelector<HTMLInputElement>(`#${id}`)!;
  }

  /** Submitting is a promise chain; one stabilisation only covers its first link. */
  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  }

  async function fillIn(page: HTMLElement, value: string): Promise<void> {
    const input = control(page, 'password');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  async function submitForm(page: HTMLElement): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  async function chooseNewPassword(value = NEW_PASSWORD): Promise<HTMLElement> {
    const page = await openPage();
    await fillIn(page, value);
    await submitForm(page);

    return page;
  }

  /** The text of the element(s) the control's aria-describedby points at. */
  function describedText(page: HTMLElement, id: string): string {
    const describedBy = control(page, id).getAttribute('aria-describedby');
    if (describedBy === null) {
      return '';
    }

    return describedBy
      .split(' ')
      .map((token) => page.querySelector(`#${token}`)?.textContent ?? '')
      .join(' ');
  }

  describe('the markup the acceptance suite navigates by', () => {
    it('labels the password field exactly "New password"', async () => {
      const label = (await openPage()).querySelector('label[for="password"]')!;

      expect(label.textContent?.trim()).toBe('New password');
    });

    it('offers a real submit button reading exactly "Set new password"', async () => {
      const button = (await openPage()).querySelector('form button')!;

      expect(button.getAttribute('type')).toBe('submit');
      expect(button.textContent?.trim()).toBe('Set new password');
    });

    it('carries novalidate, so the browser does not pre-empt the accessible errors', async () => {
      expect((await openPage()).querySelector('form')!.hasAttribute('novalidate')).toBe(true);
    });

    it('tells the password manager this is a new password, not the current one', async () => {
      expect(control(await openPage(), 'password').getAttribute('autocomplete')).toBe(
        'new-password',
      );
    });

    it('never puts the token anywhere a form could post it back', async () => {
      // The secret belongs in the request path the gateway builds, not in a hidden control.
      expect((await openPage()).querySelector('input[type="hidden"]')).toBeNull();
    });
  });

  describe('arriving without a usable link', () => {
    it('explains itself rather than rendering a form that could only fail', async () => {
      const page = await openPage('');

      expect(page.querySelector('form')).toBeNull();
      expect(page.textContent).toContain('link');
    });

    it('treats an empty token the same as no token at all', async () => {
      expect((await openPage('?token=')).querySelector('form')).toBeNull();
    });

    it('treats a token of nothing but whitespace the same way', async () => {
      expect((await openPage('?token=%20%20')).querySelector('form')).toBeNull();
    });

    it('still gives the page a heading, so it is not a dead end', async () => {
      expect((await openPage('')).querySelector('h1')).not.toBeNull();
    });

    it('offers the way out — asking for a fresh link', async () => {
      const link = (await openPage('')).querySelector('a[href="/forgot-password"]');

      expect(link).not.toBeNull();
    });

    it('calls nothing, because there is nothing it could call', async () => {
      await openPage('');

      httpMock.verify();
    });
  });

  describe('before the API is involved', () => {
    it('refuses to submit an empty form and says why, without spending the link', async () => {
      const page = await openPage();

      await submitForm(page);

      httpMock.expectNone(RESET_URL);
      expect(describedText(page, 'password')).toContain('Choose a password');
    });

    it('rejects a password shorter than the API would accept, before spending a request', async () => {
      const page = await openPage();

      await fillIn(page, 'short');
      await submitForm(page);

      httpMock.expectNone(RESET_URL);
      expect(describedText(page, 'password')).toContain('at least 12 characters');
    });

    it('states the length rule before anything is wrong', async () => {
      expect(describedText(await openPage(), 'password')).toContain('at least 12 characters');
    });

    it('moves focus to the field it is complaining about', async () => {
      const page = await openPage();

      await submitForm(page);

      expect(document.activeElement).toBe(control(page, 'password'));
    });
  });

  describe('a successful reset', () => {
    it('puts the new password to the link the query string carried', async () => {
      await chooseNewPassword();

      const request = httpMock.expectOne(RESET_URL);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ password: NEW_PASSWORD });

      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();
    });

    it('lands on the login page', async () => {
      await chooseNewPassword();

      httpMock.expectOne(RESET_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(router.url).toBe('/login');
    });

    it('creates no session — the new password has to be used to prove it works', async () => {
      await chooseNewPassword();

      httpMock.expectOne(RESET_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(session.isAuthenticated()).toBe(false);
    });
  });

  describe('when the link cannot be spent', () => {
    it('says an expired link is expired, on the form rather than under the password', async () => {
      const page = await chooseNewPassword();

      httpMock.expectOne(RESET_URL).flush(
        {
          type: PROBLEM.passwordResetExpired,
          detail: 'Password reset link expired at 2026-01-01T11:00:00.000Z',
          expiredAt: '2026-01-01T11:00:00.000Z',
        },
        { status: 410, statusText: 'Gone' },
      );
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain('expired');
      // Nothing is wrong with what was typed, so nothing is marked wrong.
      expect(control(page, 'password').hasAttribute('aria-invalid')).toBe(false);
    });

    it('distinguishes a link that was already used', async () => {
      const page = await chooseNewPassword();

      httpMock
        .expectOne(RESET_URL)
        .flush({ type: PROBLEM.passwordResetAlreadyUsed }, { status: 410, statusText: 'Gone' });
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain('already been used');
    });

    it('says an unknown link is not valid', async () => {
      const page = await chooseNewPassword();

      httpMock
        .expectOne(RESET_URL)
        .flush({ type: PROBLEM.passwordResetNotFound }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain('no longer valid');
    });

    it('does not echo the API wording, which names a machine timestamp', async () => {
      const page = await chooseNewPassword();

      httpMock.expectOne(RESET_URL).flush(
        {
          type: PROBLEM.passwordResetExpired,
          detail: 'Password reset link expired at 2026-01-01T11:00:00.000Z',
        },
        { status: 410, statusText: 'Gone' },
      );
      await settle();

      expect(page.textContent).not.toContain('2026-01-01T11:00:00.000Z');
    });

    it('stays put, so the alert can be read', async () => {
      await chooseNewPassword();

      httpMock
        .expectOne(RESET_URL)
        .flush({ type: PROBLEM.passwordResetExpired }, { status: 410, statusText: 'Gone' });
      await settle();

      expect(router.url).toBe(`/reset-password?token=${TOKEN}`);
    });

    it('focuses the alert, since no field is at fault', async () => {
      const page = await chooseNewPassword();

      httpMock
        .expectOne(RESET_URL)
        .flush({ type: PROBLEM.passwordResetExpired }, { status: 410, statusText: 'Gone' });
      await settle();

      expect(document.activeElement).toBe(page.querySelector('#reset-password-alert'));
    });

    it('keeps a route to a fresh link on the page, not only in the message', async () => {
      const page = await openPage();

      expect(page.querySelector('a[href="/forgot-password"]')).not.toBeNull();
    });
  });

  describe('when the API refuses the password itself', () => {
    it('puts the server-side field error under the password', async () => {
      const page = await chooseNewPassword();

      httpMock.expectOne(RESET_URL).flush(
        {
          type: PROBLEM.validationError,
          errors: [
            {
              field: 'password',
              message: 'password must be longer than or equal to 12 characters',
            },
          ],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      await settle();

      expect(describedText(page, 'password')).toContain('at least 12 characters');
    });

    it('shows the fallback in the alert when the connection drops', async () => {
      const page = await chooseNewPassword();

      httpMock.expectOne(RESET_URL).error(new ProgressEvent('error'));
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain(
        'could not change your password',
      );
    });
  });
});
