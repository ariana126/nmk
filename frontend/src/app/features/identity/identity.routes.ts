import { Routes } from '@angular/router';

import { authGuard } from '../../core/identity/auth-guard';
import { LoginPage } from './login/login-page';
import { ProfilePage } from './profile/profile-page';
import { SignUpPage } from './sign-up/sign-up-page';

/**
 * The identity pages share one lazy chunk rather than one each. They share the server-error mapping
 * and the field markup, so splitting them would duplicate that per page — and someone on /login is
 * usually one step from /profile anyway.
 */
export const identityRoutes: Routes = [
  { path: 'sign-up', component: SignUpPage, title: 'Create your account · nmk' },
  { path: 'login', component: LoginPage, title: 'Log in · nmk' },
  {
    path: 'profile',
    component: ProfilePage,
    title: 'Your profile · nmk',
    canActivate: [authGuard],
  },
];
