import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { PROBLEM, toProblemDetails } from './problem-details';

/** Builds the kind of failure `HttpClient` hands to an error callback for a `problem+json` body. */
function problemResponse(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: '/api/users' });
}

describe('toProblemDetails', () => {
  it('narrows a validation-error document, field errors and all', () => {
    const problem = toProblemDetails(
      problemResponse(400, {
        type: PROBLEM.validationError,
        title: 'Validation Error',
        status: 400,
        detail: 'One or more fields failed validation.',
        errors: [{ field: 'email', message: 'email must be an email' }],
      }),
    );

    expect(problem?.type).toBe(PROBLEM.validationError);
    expect(problem?.errors).toEqual([{ field: 'email', message: 'email must be an email' }]);
  });

  it('narrows a user-already-exists document and keeps its email extension member', () => {
    const problem = toProblemDetails(
      problemResponse(409, {
        type: PROBLEM.userAlreadyExists,
        title: 'User Already Exists',
        status: 409,
        email: 'ariana@example.com',
      }),
    );

    expect(problem?.type).toBe(PROBLEM.userAlreadyExists);
    expect(problem?.email).toBe('ariana@example.com');
  });

  it('narrows a document carrying only `type` — every other member is optional per RFC 9457', () => {
    expect(toProblemDetails(problemResponse(401, { type: 'about:blank' }))?.type).toBe(
      'about:blank',
    );
  });

  it('returns undefined for a network failure, where `error` is a ProgressEvent and status is 0', () => {
    const networkFailure = new HttpErrorResponse({
      status: 0,
      error: new ProgressEvent('error'),
      url: '/api/users',
    });

    expect(toProblemDetails(networkFailure)).toBeUndefined();
  });

  it('returns undefined for a body that is not a problem document', () => {
    // A proxy returning an HTML error page, and a JSON body with no `type` member.
    expect(toProblemDetails(problemResponse(502, '<html>Bad Gateway</html>'))).toBeUndefined();
    expect(toProblemDetails(problemResponse(500, { message: 'boom' }))).toBeUndefined();
    expect(toProblemDetails(problemResponse(500, null))).toBeUndefined();
  });

  it('returns undefined for a `type` that is present but not a string', () => {
    expect(toProblemDetails(problemResponse(400, { type: 42 }))).toBeUndefined();
  });

  it('returns undefined for a throwable that never came from HttpClient', () => {
    expect(toProblemDetails(new Error('Login returned no access token'))).toBeUndefined();
    expect(toProblemDetails(undefined)).toBeUndefined();
  });
});
