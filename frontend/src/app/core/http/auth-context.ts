import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marks a request that must go out without the bearer token.
 *
 * **Why a context token rather than a URL list inside the interceptor.** The endpoints that take no
 * token — `POST /api/users`, `POST /api/auth/login`, `POST /api/password-resets` and
 * `PUT /api/password-resets/{token}/password` — are distinguished from the ones that do
 * (`GET /api/users/me`) by more than their path prefix. An interceptor deciding this would have to
 * re-encode route-and-method knowledge the generated client already owns, in a place no gate keeps in
 * step with the contract. The call site is the only code that knows whether it is calling an
 * anonymous endpoint, so the decision belongs there. There is one such call site per endpoint above,
 * and all of them live in `IdentityGateway`.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/** Use as `{ context: anonymous() }` on a generated client call that must carry no token. */
export function anonymous(): HttpContext {
  return new HttpContext().set(SKIP_AUTH, true);
}
