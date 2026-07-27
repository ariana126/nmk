import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { accessTokenInterceptor } from './core/http/access-token-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // `withComponentInputBinding` binds route and query params straight to `input()` signals, so a
    // page reads `returnUrl` as an input rather than reaching into `ActivatedRoute.snapshot`.
    provideRouter(routes, withComponentInputBinding()),
    // The contract's `bearer` scheme is not generated, so it lives in this interceptor rather than
    // being threaded through every generated call. A request that must go out unauthenticated opts
    // out at the call site with `{ context: anonymous() }` — see core/http/auth-context.ts.
    provideHttpClient(withInterceptors([accessTokenInterceptor])),
  ],
};
