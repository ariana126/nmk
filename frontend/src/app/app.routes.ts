import { Routes } from '@angular/router';

/**
 * Every route is lazy, and every route carries a `title`. The title is not decoration: Angular's
 * default `TitleStrategy` writes it to `document.title`, which is what the shell's live region
 * announces after a navigation.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'nmk',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    // The identity pages sit at the root rather than under a prefix, so the feature mounts on the
    // empty path too. The `pathMatch: 'full'` above is what stops it shadowing the home route.
    path: '',
    loadChildren: () => import('./features/identity/identity.routes').then((m) => m.identityRoutes),
  },
  {
    path: '**',
    title: 'Page not found · nmk',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
