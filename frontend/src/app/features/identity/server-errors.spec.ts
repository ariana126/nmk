import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FieldTree } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';

import { PROBLEM, ProblemDetails } from '../../core/http/problem-details';
import { FieldTargets, SERVER_ERROR_KIND, toSubmissionErrors } from './server-errors';

const FALLBACK = 'We could not complete that. Try again.';

describe('toSubmissionErrors', () => {
  let targets: FieldTargets;
  let emailField: FieldTree<string>;
  let passwordField: FieldTree<string>;

  beforeEach(() => {
    // `form()` injects, so it only works inside an injection context — in a component that is the
    // field initializer, and here it has to be arranged explicitly.
    const model = TestBed.runInInjectionContext(() => form(signal({ email: '', password: '' })));
    emailField = model.email;
    passwordField = model.password;
    targets = { email: emailField, password: passwordField };
  });

  describe('a validation error', () => {
    it('lands each field problem on the field it names', () => {
      const errors = toSubmissionErrors(
        {
          type: PROBLEM.validationError,
          errors: [
            { field: 'email', message: 'email must be an email' },
            {
              field: 'password',
              message: 'password must be longer than or equal to 12 characters',
            },
          ],
        },
        targets,
        FALLBACK,
      );

      expect(errors).toHaveLength(2);
      expect(errors[0].fieldTree).toBe(emailField);
      expect(errors[1].fieldTree).toBe(passwordField);
      expect(errors.every((error) => error.kind === SERVER_ERROR_KIND)).toBe(true);
    });

    it('rewrites the API wording into something written for the person reading it', () => {
      const [error] = toSubmissionErrors(
        {
          type: PROBLEM.validationError,
          errors: [
            {
              field: 'password',
              message: 'password must be longer than or equal to 12 characters',
            },
          ],
        },
        targets,
        FALLBACK,
      );

      expect(error.message).toBe('Use at least 12 characters.');
    });

    it('passes through the message for a rule the client does not know about', () => {
      const [error] = toSubmissionErrors(
        {
          type: PROBLEM.validationError,
          errors: [{ field: 'nickname', message: 'nickname is rude' }],
        },
        targets,
        FALLBACK,
      );

      // Unknown to the form, so it cannot be bound — but it must still be said.
      expect(error.message).toBe('nickname is rude');
      expect(error.fieldTree).toBeUndefined();
    });

    it('falls back to the form when the array is missing or empty', () => {
      const missing = toSubmissionErrors({ type: PROBLEM.validationError }, targets, FALLBACK);
      const empty = toSubmissionErrors(
        { type: PROBLEM.validationError, errors: [] },
        targets,
        FALLBACK,
      );

      expect(missing[0]).toEqual({ kind: SERVER_ERROR_KIND, message: FALLBACK });
      expect(empty[0]).toEqual({ kind: SERVER_ERROR_KIND, message: FALLBACK });
    });
  });

  describe('a duplicate email', () => {
    it('lands on the email field, even though the 409 carries no field list', () => {
      const [error] = toSubmissionErrors(
        { type: PROBLEM.userAlreadyExists, email: 'ariana@example.com' },
        targets,
        FALLBACK,
      );

      expect(error.fieldTree).toBe(emailField);
      expect(error.message).toContain('already exists');
    });

    it('does not echo the API detail, whose wording the UI does not control', () => {
      const [error] = toSubmissionErrors(
        {
          type: PROBLEM.userAlreadyExists,
          detail: 'User already exists with email ariana@example.com',
        },
        targets,
        FALLBACK,
      );

      expect(error.message).not.toContain('User already exists with email');
    });
  });

  describe('rejected credentials', () => {
    it('stays on the form rather than naming a field, so it reveals no registered address', () => {
      const [error] = toSubmissionErrors({ type: PROBLEM.invalidCredentials }, targets, FALLBACK);

      expect(error.fieldTree).toBeUndefined();
      expect(error.message).toBe('Email or password is incorrect.');
    });
  });

  describe('an unknown address on the forgot-password form', () => {
    it('lands on the email field, which is the only thing the visitor can change', () => {
      const [error] = toSubmissionErrors({ type: PROBLEM.userNotFound }, targets, FALLBACK);

      expect(error.fieldTree).toBe(emailField);
      expect(error.message).toContain('no account');
    });

    it('does not echo the API detail, which repeats the address back verbatim', () => {
      const [error] = toSubmissionErrors(
        {
          type: PROBLEM.userNotFound,
          detail: 'No user found with email ariana@example.com',
        },
        targets,
        FALLBACK,
      );

      expect(error.message).not.toContain('No user found with email');
    });
  });

  describe('a reset link that cannot be spent', () => {
    /**
     * All three land on the form root rather than on the password field. The password the visitor
     * typed is not what is wrong — the link is — so an error under that input would send them to
     * re-type something that would fail again for the same reason.
     */
    it('says the link is not valid when the API knows nothing about it', () => {
      const [error] = toSubmissionErrors(
        { type: PROBLEM.passwordResetNotFound },
        targets,
        FALLBACK,
      );

      expect(error.fieldTree).toBeUndefined();
      expect(error.message).toContain('no longer valid');
    });

    it('distinguishes an expired link, so the visitor knows to ask for another', () => {
      const [error] = toSubmissionErrors({ type: PROBLEM.passwordResetExpired }, targets, FALLBACK);

      expect(error.fieldTree).toBeUndefined();
      expect(error.message).toContain('expired');
    });

    it('distinguishes a link that was already spent, which is not the same as expired', () => {
      const [error] = toSubmissionErrors(
        { type: PROBLEM.passwordResetAlreadyUsed },
        targets,
        FALLBACK,
      );

      expect(error.fieldTree).toBeUndefined();
      expect(error.message).toContain('already been used');
    });
  });

  describe('anything else', () => {
    it('reports the fallback on the form when the failure is not a problem document', () => {
      expect(toSubmissionErrors(undefined, targets, FALLBACK)).toEqual([
        { kind: SERVER_ERROR_KIND, message: FALLBACK },
      ]);
    });

    it('reports the fallback for a problem type the client does not recognise', () => {
      const unknown: ProblemDetails = { type: 'https://my-api-doc.dev/problems/teapot' };

      expect(toSubmissionErrors(unknown, targets, FALLBACK)).toEqual([
        { kind: SERVER_ERROR_KIND, message: FALLBACK },
      ]);
    });
  });
});
