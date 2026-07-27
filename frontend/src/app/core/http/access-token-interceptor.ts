import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { SessionStore } from '../identity/session-store';
import { SKIP_AUTH } from './auth-context';

/**
 * Attaches the bearer token to API requests, and reacts when the API rejects it.
 *
 * This is where authentication lives, rather than threaded through the generated client — the
 * contract's `bearer` scheme is a transport concern and orval does not generate it.
 */
export const accessTokenInterceptor: HttpInterceptorFn = (request, next) => {
  // Never let the token leave this origin. The generated client only ever emits relative `/api`
  // routes, so this is defensive — but it costs one comparison and the failure it prevents (a bearer
  // token in someone else's access log) cannot be undone.
  if (!request.url.startsWith('/api/') || request.context.get(SKIP_AUTH)) {
    return next(request);
  }

  const session = inject(SessionStore);
  const router = inject(Router);

  const token = session.accessToken();
  const authorized =
    token === '' ? request : request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && token !== '') {
        // The token we sent was rejected, so it is expired or revoked. Drop it: keeping it means the
        // guard keeps claiming the user is authenticated and every page fails the same way.
        //
        // `token !== ''` matters — a 401 on a request we sent *without* a token must not clear one
        // that arrived in between. And requests marked `SKIP_AUTH` never reach this handler at all,
        // which is what stops a failed login (a 401 meaning "wrong password") from being mistaken
        // for an expired session.
        session.clear();

        if (!router.url.startsWith('/login')) {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }

      // Always rethrow. The interceptor handles the session; what the *user* sees is the caller's
      // decision, and a swallowed error would leave a form waiting forever.
      return throwError(() => error);
    }),
  );
};
