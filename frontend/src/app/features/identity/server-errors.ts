import { FieldTree, ValidationError } from '@angular/forms/signals';

import { PROBLEM, ProblemDetails } from '../../core/http/problem-details';

/**
 * The form fields a server error can be attributed to, keyed by the name the API uses for them.
 * The backend reports `errors[].field` as the DTO property name, so these keys are `email`,
 * `password`, `firstName`, `lastName` — identical to the form's own field names, which is why no
 * translation table is needed.
 */
export type FieldTargets = Readonly<Record<string, FieldTree<string> | undefined>>;

/** Marks an error as having come from the API rather than from a client-side rule. */
export const SERVER_ERROR_KIND = 'server';

/**
 * class-validator's wording is written for developers ("password must be longer than or equal to
 * 12 characters"). Replace the messages for rules we already state in the UI; pass anything else
 * through unchanged, so a rule the backend adds later still surfaces rather than vanishing.
 */
const FRIENDLY_MESSAGES: Readonly<Record<string, string>> = {
  email: 'Enter a valid email address.',
  password: 'Use at least 12 characters.',
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
};

/**
 * Turns an API failure into validation errors a signal form can display.
 *
 * An error carrying a `fieldTree` renders under that field; one without it lands on the form root,
 * which is what the `role="alert"` banner shows. That distinction is the whole design: a problem the
 * user can fix in a specific input belongs beside that input, and everything else belongs in one
 * place where it cannot be missed.
 *
 * Branching is on `type` only. `detail` is optional per RFC 9457, and its wording belongs to the
 * server — the messages here are written client-side so the UI controls its own voice.
 */
export function toSubmissionErrors(
  problem: ProblemDetails | undefined,
  targets: FieldTargets,
  fallbackMessage: string,
): ValidationError.WithOptionalFieldTree[] {
  if (problem === undefined) {
    // Not a problem document at all: a dropped connection, an HTML error page from a proxy, or a
    // failure thrown by our own code. Nothing field-specific can be said.
    return [formError(fallbackMessage)];
  }

  switch (problem.type) {
    case PROBLEM.validationError:
      return validationErrors(problem, targets, fallbackMessage);

    case PROBLEM.userAlreadyExists:
      // The 409 carries no `errors` array — the API states the conflict in its own member. Email is
      // the only field it can be about, so the binding is made explicitly here.
      return [
        fieldError(
          'An account with this email already exists. Log in instead, or use another address.',
          targets['email'],
        ),
      ];

    case PROBLEM.invalidCredentials:
      // Deliberately a form-level error, not one on the email field. Saying which half was wrong
      // tells an attacker which addresses are registered.
      return [formError('Email or password is incorrect.')];

    case PROBLEM.userNotFound:
      // The mirror image of `userAlreadyExists`: a 404 with the address in its own member, and the
      // email field is the only thing the visitor can change to fix it.
      return [
        fieldError(
          'There is no account with this email address. Check the spelling, or sign up instead.',
          targets['email'],
        ),
      ];

    // The three below all say the same structural thing — the *link* is unusable, not the password
    // that was typed — so they belong on the form root and not under the password field. Sending
    // someone back to re-type a password that would fail again for the same reason is worse than
    // saying nothing. They are told apart because the remedy differs: a new link for the first two,
    // and for the third a reminder that the change may already have happened.
    case PROBLEM.passwordResetNotFound:
      return [formError('This reset link is no longer valid. Ask for a new one to continue.')];

    case PROBLEM.passwordResetExpired:
      return [formError('This reset link has expired. Ask for a new one to continue.')];

    case PROBLEM.passwordResetAlreadyUsed:
      return [
        formError(
          'This reset link has already been used. Log in with your new password, or ask for another link.',
        ),
      ];

    default:
      return [formError(fallbackMessage)];
  }
}

function validationErrors(
  problem: ProblemDetails,
  targets: FieldTargets,
  fallbackMessage: string,
): ValidationError.WithOptionalFieldTree[] {
  const errors = problem.errors ?? [];
  if (errors.length === 0) {
    return [formError(fallbackMessage)];
  }

  return errors.map((error) => {
    const field = error.field ?? '';
    // A field the form does not have — the API validating something we do not render — still has to
    // be reported. Without a target it becomes a form-level error rather than disappearing.
    return fieldError(FRIENDLY_MESSAGES[field] ?? error.message ?? fallbackMessage, targets[field]);
  });
}

function formError(message: string): ValidationError.WithOptionalFieldTree {
  return { kind: SERVER_ERROR_KIND, message };
}

function fieldError(
  message: string,
  fieldTree: FieldTree<string> | undefined,
): ValidationError.WithOptionalFieldTree {
  return fieldTree === undefined
    ? formError(message)
    : { kind: SERVER_ERROR_KIND, message, fieldTree };
}
