import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PROBLEM } from '../../../core/http/problem-details';
import { ForgotPasswordPage } from './forgot-password-page';

@Component({ template: '<p>stub</p>' })
class StubPage {}

const KNOWN_ADDRESS = 'ariana@example.com';

describe('ForgotPasswordPage', () => {
  let httpMock: HttpTestingController;
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
            { path: 'forgot-password', component: ForgotPasswordPage },
            { path: 'login', component: StubPage },
            { path: 'sign-up', component: StubPage },
          ],
          withComponentInputBinding(),
        ),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function openPage(): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create('/forgot-password');

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

  async function fillIn(page: HTMLElement, address: string): Promise<void> {
    const input = control(page, 'email');
    input.value = address;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  async function submitForm(page: HTMLElement): Promise<void> {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  async function askFor(address = KNOWN_ADDRESS): Promise<HTMLElement> {
    const page = await openPage();
    await fillIn(page, address);
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

  function confirmation(page: HTMLElement): HTMLElement {
    return page.querySelector<HTMLElement>('form [role="status"]')!;
  }

  describe('the markup the acceptance suite navigates by', () => {
    it('labels the address field exactly "Email address"', async () => {
      const label = (await openPage()).querySelector('label[for="email"]')!;

      expect(label.textContent?.trim()).toBe('Email address');
    });

    it('offers a real submit button reading exactly "Send reset link"', async () => {
      const button = (await openPage()).querySelector('form button')!;

      expect(button.getAttribute('type')).toBe('submit');
      expect(button.textContent?.trim()).toBe('Send reset link');
    });

    it('keeps the confirmation region inside the form, where the suite looks for it', async () => {
      // The locator is `form [role="status"]`. A banner hoisted out of the form is invisible to it.
      expect(confirmation(await openPage())).not.toBeNull();
    });

    it('carries novalidate, so the browser does not pre-empt the accessible errors', async () => {
      expect((await openPage()).querySelector('form')!.hasAttribute('novalidate')).toBe(true);
    });

    it('tells the password manager the field is an email address', async () => {
      expect(control(await openPage(), 'email').getAttribute('autocomplete')).toBe('email');
    });
  });

  describe('before the API is involved', () => {
    it('says nothing has been sent until something has', async () => {
      expect(confirmation(await openPage()).textContent?.trim()).toBe('');
    });

    it('refuses to submit an empty form and says why, without calling the API', async () => {
      const page = await openPage();

      await submitForm(page);

      httpMock.expectNone('/api/password-resets');
      expect(describedText(page, 'email')).toContain('Enter your email address');
    });

    it('moves focus to the field it is complaining about', async () => {
      const page = await openPage();

      await submitForm(page);

      expect(document.activeElement).toBe(control(page, 'email'));
    });
  });

  describe('a request that is accepted', () => {
    it('posts just the address', async () => {
      await askFor();

      const request = httpMock.expectOne('/api/password-resets');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ email: KNOWN_ADDRESS });

      request.flush(null, { status: 201, statusText: 'Created' });
      await settle();
    });

    it('confirms the link is on its way', async () => {
      const page = await askFor();

      httpMock
        .expectOne('/api/password-resets')
        .flush(null, { status: 201, statusText: 'Created' });
      await settle();

      expect(confirmation(page).textContent).toContain('sent');
      expect(confirmation(page).textContent).toContain(KNOWN_ADDRESS);
    });

    it('stays on the page rather than navigating away from the confirmation', async () => {
      await askFor();

      httpMock
        .expectOne('/api/password-resets')
        .flush(null, { status: 201, statusText: 'Created' });
      await settle();

      expect(router.url).toBe('/forgot-password');
    });

    it('moves focus to the confirmation, so it is not only a visual change', async () => {
      const page = await askFor();

      httpMock
        .expectOne('/api/password-resets')
        .flush(null, { status: 201, statusText: 'Created' });
      await settle();

      expect(document.activeElement).toBe(confirmation(page));
    });

    it('keeps the confirmation while the address is retyped, unlike a field error', async () => {
      // Submission errors are sourced on the field's value and clear on the next keystroke. The
      // confirmation must not: someone checking the spelling of what they typed would lose it.
      const page = await askFor();

      httpMock
        .expectOne('/api/password-resets')
        .flush(null, { status: 201, statusText: 'Created' });
      await settle();
      await fillIn(page, 'ariana@example.co');

      expect(confirmation(page).textContent).toContain('sent');
    });

    it('withdraws the previous confirmation once a new request is in flight', async () => {
      const page = await askFor();

      httpMock
        .expectOne('/api/password-resets')
        .flush(null, { status: 201, statusText: 'Created' });
      await settle();

      await fillIn(page, 'someone.else@example.com');
      await submitForm(page);

      // Still claiming the first address was written to would be wrong the moment the second is.
      expect(confirmation(page).textContent).not.toContain(KNOWN_ADDRESS);

      httpMock
        .expectOne('/api/password-resets')
        .flush(null, { status: 201, statusText: 'Created' });
      await settle();
    });
  });

  describe('when the API refuses', () => {
    it('reports an unknown address against the email field, where it can be fixed', async () => {
      const page = await askFor('nobody@example.com');

      httpMock.expectOne('/api/password-resets').flush(
        {
          type: PROBLEM.userNotFound,
          detail: 'No user found with email nobody@example.com',
          email: 'nobody@example.com',
        },
        { status: 404, statusText: 'Not Found' },
      );
      await settle();

      expect(describedText(page, 'email')).toContain('no account');
      expect(control(page, 'email').getAttribute('aria-invalid')).toBe('true');
    });

    it('does not echo the API wording for that 404', async () => {
      const page = await askFor('nobody@example.com');

      httpMock.expectOne('/api/password-resets').flush(
        {
          type: PROBLEM.userNotFound,
          detail: 'No user found with email nobody@example.com',
        },
        { status: 404, statusText: 'Not Found' },
      );
      await settle();

      expect(page.textContent).not.toContain('No user found with email');
    });

    it('claims nothing was sent when nothing was', async () => {
      const page = await askFor('nobody@example.com');

      httpMock
        .expectOne('/api/password-resets')
        .flush({ type: PROBLEM.userNotFound }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(confirmation(page).textContent?.trim()).toBe('');
    });

    it('puts a server-side field error under the field the API named', async () => {
      const page = await askFor('ariana@nope');

      httpMock.expectOne('/api/password-resets').flush(
        {
          type: PROBLEM.validationError,
          errors: [{ field: 'email', message: 'email must be an email' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      await settle();

      expect(describedText(page, 'email')).toContain('valid email address');
    });

    it('shows the fallback in the alert when the connection drops', async () => {
      const page = await askFor();

      httpMock.expectOne('/api/password-resets').error(new ProgressEvent('error'));
      await settle();

      expect(page.querySelector('[role="alert"]')!.textContent).toContain('could not send');
    });

    it('focuses the alert when the failure belongs to no single field', async () => {
      const page = await askFor();

      httpMock.expectOne('/api/password-resets').error(new ProgressEvent('error'));
      await settle();

      expect(document.activeElement).toBe(page.querySelector('#forgot-password-alert'));
    });
  });
});
