const configuredApiBaseUrl =
  process.env.API_BASE_URL ?? 'http://localhost:3000/api';

/**
 * Serenity resolves every resource URI with `new URL(uri, apiBaseUrl)`, which discards the
 * base's last path segment unless the base ends in a slash — `new URL('users', '…/api')`
 * would resolve to `…/users` and 404. So guarantee the trailing slash, and keep resource
 * URIs relative (`users`, not `/users`).
 */
export const apiBaseUrl: string = configuredApiBaseUrl.endsWith('/')
  ? configuredApiBaseUrl
  : `${configuredApiBaseUrl}/`;

/**
 * The frontend the suite drives in a browser: the **test** stack on 4201, which proxies `/api` to
 * the same backend test stack `apiBaseUrl` names. Pointing this at the dev server on 4200 would
 * drive a UI wired to a database this suite never truncates.
 */
export const appBaseUrl: string =
  process.env.APP_BASE_URL ?? 'http://localhost:4201';
