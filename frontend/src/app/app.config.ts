import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // The generated API services in src/app/api inject HttpClient. Authentication belongs
    // here too, as withInterceptors([...]), once there is a token to attach.
    provideHttpClient(),
  ],
};
