import { HttpErrorResponse } from '@angular/common/http';

/**
 * The problem types the API emits, as they appear in a response's `type` member. The backend builds
 * these from a `TYPE_BASE_URL` constant of its own; this is the client's copy of the same vocabulary.
 *
 * They are URIs, not URLs — nothing dereferences them. They are identifiers, and comparing against
 * them is how the client tells one failure from another.
 */
export const PROBLEM = {
  validationError: 'https://my-api-doc.dev/problems/validation-error',
  userAlreadyExists: 'https://my-api-doc.dev/problems/user-already-exists',
  invalidCredentials: 'https://my-api-doc.dev/problems/invalid-credentials',
  entityNotFound: 'https://my-api-doc.dev/problems/entity-not-found',
  /** `POST /api/password-resets` — nobody is registered with that address. */
  userNotFound: 'https://my-api-doc.dev/problems/user-not-found',
  /** `PUT /api/password-resets/{token}/password` — the link matches no reset on record. */
  passwordResetNotFound: 'https://my-api-doc.dev/problems/password-reset-not-found',
  /** The reset's window has closed. */
  passwordResetExpired: 'https://my-api-doc.dev/problems/password-reset-expired',
  /**
   * The reset was already spent on a password change.
   *
   * This one shares its 410 with `passwordResetExpired`, and OpenAPI can only carry one example
   * per status, so `api/openapi.json` documents the expired case alone. The type is real and the
   * API emits it; this constant is the client's own vocabulary, not a projection of the spec.
   */
  passwordResetAlreadyUsed: 'https://my-api-doc.dev/problems/password-reset-already-used',
} as const;

/** One entry of a validation error's `errors` array. `field` matches the DTO property name. */
export interface FieldProblem {
  readonly field?: string;
  readonly message?: string;
}

/**
 * An RFC 9457 problem document. Only `type` is guaranteed present — the backend's `ProblemDetail`
 * always emits `type`, `title` and `status`, and spreads `detail`, `instance` and extension members
 * only when they are defined.
 *
 * **Branch on `type`, never on `detail`.** `detail` is optional per RFC 9457 and its wording belongs
 * to the server; `type` is the stable identifier. The acceptance suite asserts on `type` for the same
 * reason.
 */
export interface ProblemDetails {
  readonly type: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  /** `validation-error` only. */
  readonly errors?: readonly FieldProblem[];
  /** `user-already-exists` only. */
  readonly email?: string;
}

/**
 * Narrows an unknown thrown value to a problem document, or `undefined` when it is not one.
 *
 * Everything a caller can be handed goes through here, and most of it is not a problem document: a
 * network failure (`status: 0`, `error` is a `ProgressEvent`), an HTML error page from a proxy, or a
 * plain `Error` thrown by our own code. `HttpClient` parses a JSON body into `error` regardless of
 * the `application/problem+json` content type, so the guard has to be on the shape rather than the
 * header.
 */
export function toProblemDetails(error: unknown): ProblemDetails | undefined {
  if (!(error instanceof HttpErrorResponse)) {
    return undefined;
  }

  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  // A network failure hands us a `ProgressEvent`, and `Event.type` is a string — `'error'`. That
  // collides exactly with the member we key off, so a shape check alone would happily report a
  // dropped connection as a problem document of type "error". Rule out events explicitly.
  if (body instanceof Event) {
    return undefined;
  }

  const type: unknown = (body as { type?: unknown }).type;
  return typeof type === 'string' ? (body as ProblemDetails) : undefined;
}
