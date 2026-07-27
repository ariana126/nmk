/**
 * The `localStorage` key holding the bearer token.
 *
 * It lives in its own dependency-free module so the accessibility audit can import it. `a11y/` sits
 * outside `tsconfig.app.json` and runs in Node under Playwright, so it can only import a file that
 * pulls in no Angular runtime — which is exactly what this one is. The alternative was retyping the
 * literal in a second place that nothing keeps in sync.
 */
export const ACCESS_TOKEN_STORAGE_KEY = 'nmk.accessToken';
