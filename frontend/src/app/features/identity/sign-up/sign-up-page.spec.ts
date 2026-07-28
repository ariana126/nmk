import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PROBLEM } from '../../../core/http/problem-details';
import { SessionStore } from '../../../core/identity/session-store';
import { SignUpPage } from './sign-up-page';

@Component({ template: '<p>stub</p>' })
class StubPage {}

const VALID = {
  firstName: 'Ariana',
  lastName: 'Doe',
  email: 'ariana@example.com',
  password: 'Str0ng-Ariana-Passphrase!2026',
};

describe('SignUpPage', () => {
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
            { path: 'sign-up', component: SignUpPage },
            { path: 'login', component: StubPage },
            { path: 'profile', component: StubPage },
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

  async function openSignUp(): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create('/sign-up');

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

  async function fillIn(page: HTMLElement, values: Partial<typeof VALID>): Promise<void> {
    for (const [id, value] of Object.entries(values)) {
      const input = control(page, id);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
    await harness.fixture.whenStable();
  }

  async function submitForm(page: HTMLElement): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  async function signUpWith(values = VALID): Promise<HTMLElement> {
    const page = await openSignUp();
    await fillIn(page, values);
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

  describe('the form itself', () => {
    it('carries novalidate, so the browser does not pre-empt the accessible errors', async () => {
      expect((await openSignUp()).querySelector('form')!.hasAttribute('novalidate')).toBe(true);
    });

    it('labels every control and tells the password manager what each one is', async () => {
      const page = await openSignUp();

      for (const [id, autocomplete] of [
        ['firstName', 'given-name'],
        ['lastName', 'family-name'],
        ['email', 'email'],
        ['password', 'new-password'],
      ]) {
        expect(page.querySelector(`label[for="${id}"]`)).not.toBeNull();
        expect(control(page, id).getAttribute('autocomplete')).toBe(autocomplete);
      }
    });

    it('points the password field at its rule before anything is wrong', async () => {
      // The requirement is stated up front, not sprung as an error after the fact.
      expect(describedText(await openSignUp(), 'password')).toContain('at least 12 characters');
    });

    it('has no confirm-password field, which the API would reject as an unknown property', async () => {
      expect((await openSignUp()).querySelector('#confirmPassword')).toBeNull();
    });
  });

  describe('before the API is involved', () => {
    it('refuses to submit an empty form and says why, without calling the API', async () => {
      const page = await openSignUp();

      await submitForm(page);

      httpMock.expectNone('/api/users');
      expect(describedText(page, 'firstName')).toContain('Enter your first name');
      expect(describedText(page, 'email')).toContain('Enter your email address');
    });

    it('rejects a password shorter than the API would accept, before spending a request', async () => {
      const page = await openSignUp();

      await fillIn(page, { ...VALID, password: 'short' });
      await submitForm(page);

      httpMock.expectNone('/api/users');
      expect(describedText(page, 'password')).toContain('at least 12 characters');
    });

    it('keeps the hint alongside the error rather than replacing it', async () => {
      const page = await openSignUp();

      await fillIn(page, { ...VALID, password: 'short' });
      await submitForm(page);

      expect(control(page, 'password').getAttribute('aria-describedby')).toBe(
        'password-hint password-error',
      );
    });

    it('moves focus to the first invalid control in reading order', async () => {
      const page = await openSignUp();

      await submitForm(page);

      expect(document.activeElement).toBe(control(page, 'firstName'));
    });
  });

  describe('a successful sign-up', () => {
    it('posts exactly the four fields the API accepts', async () => {
      await signUpWith();

      const request = httpMock.expectOne('/api/users');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(VALID);

      request.flush(null, { status: 201, statusText: 'Created' });
      await settle();
      httpMock.expectOne('/api/auth/login').flush({ accessToken: 'a-fresh-token' });
      await settle();
    });

    it('logs the new account straight in and lands on the profile', async () => {
      await signUpWith();

      httpMock.expectOne('/api/users').flush(null, { status: 201, statusText: 'Created' });
      await settle();

      const login = httpMock.expectOne('/api/auth/login');
      expect(login.request.body).toEqual({ email: VALID.email, password: VALID.password });

      login.flush({ accessToken: 'a-fresh-token' });
      await settle();

      expect(session.accessToken()).toBe('a-fresh-token');
      expect(router.url).toBe('/profile');
    });
  });

  describe('when the account was created but the login was not', () => {
    it('hands over to the login page rather than back to a form that would now conflict', async () => {
      const page = await signUpWith();

      httpMock.expectOne('/api/users').flush(null, { status: 201, statusText: 'Created' });
      await settle();
      httpMock.expectOne('/api/auth/login').error(new ProgressEvent('error'));
      await settle();

      // `@` is legal unencoded in a query value, and that is how the router serialises it.
      expect(router.url).toBe(`/login?created=1&email=${VALID.email}`);
      // Reporting the sign-up as failed would be a lie: the account exists.
      expect(page.querySelector('[role="alert"]')!.textContent).not.toContain(
        'could not create your account',
      );
    });
  });

  describe('when the API refuses', () => {
    it('reports a duplicate email against the email field, where it can be fixed', async () => {
      const page = await signUpWith();

      httpMock.expectOne('/api/users').flush(
        {
          type: PROBLEM.userAlreadyExists,
          detail: `User already exists with email ${VALID.email}`,
          email: VALID.email,
        },
        { status: 409, statusText: 'Conflict' },
      );
      await settle();

      expect(describedText(page, 'email')).toContain('already exists');
      expect(control(page, 'email').getAttribute('aria-invalid')).toBe('true');
    });

    it('does not echo the API wording for that conflict', async () => {
      const page = await signUpWith();

      httpMock.expectOne('/api/users').flush(
        {
          type: PROBLEM.userAlreadyExists,
          detail: `User already exists with email ${VALID.email}`,
        },
        { status: 409, statusText: 'Conflict' },
      );
      await settle();

      expect(page.textContent).not.toContain('User already exists with email');
    });

    it('puts a server-side field error under the field the API named', async () => {
      const page = await signUpWith();

      httpMock.expectOne('/api/users').flush(
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

    it('shows the fallback in the alert when the connection drops, and stays put', async () => {
      const page = await signUpWith();

      httpMock.expectOne('/api/users').error(new ProgressEvent('error'));
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain(
        'could not create your account',
      );
      expect(router.url).toBe('/sign-up');
      expect(session.isAuthenticated()).toBe(false);
    });

    it('focuses the alert when the failure belongs to no single field', async () => {
      const page = await signUpWith();

      httpMock.expectOne('/api/users').error(new ProgressEvent('error'));
      await settle();

      expect(document.activeElement).toBe(page.querySelector('#sign-up-alert'));
    });

    it('clears a server error as soon as the offending field is edited', async () => {
      const page = await signUpWith();

      httpMock
        .expectOne('/api/users')
        .flush({ type: PROBLEM.userAlreadyExists }, { status: 409, statusText: 'Conflict' });
      await settle();
      expect(describedText(page, 'email')).toContain('already exists');

      await fillIn(page, { email: 'someone.else@example.com' });

      expect(control(page, 'email').hasAttribute('aria-invalid')).toBe(false);
    });
  });
});
