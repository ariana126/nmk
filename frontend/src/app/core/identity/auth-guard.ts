import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStore } from './session-store';

/**
 * Keeps anonymous visitors off authenticated routes, sending them to log in and remembering where
 * they were headed.
 *
 * **This is not security.** It is a redirect that saves the user from a page that would only fail;
 * anyone can edit the bundle. `GET /api/users/me` is what actually enforces authentication, and it
 * would 401 regardless of what this returns.
 *
 * Returning a `UrlTree` rather than calling `router.navigate()` and returning `false` matters: the
 * router treats the tree as a redirect within the same navigation, so there is no flash of a
 * cancelled route on the way through.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return (
    session.isAuthenticated() ||
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};
