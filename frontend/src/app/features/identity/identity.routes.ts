import { Routes } from '@angular/router';

import { authGuard } from '../../core/identity/auth-guard';
import { ForgotPasswordPage } from './forgot-password/forgot-password-page';
import { LoginPage } from './login/login-page';
import { ProfilePage } from './profile/profile-page';
import { ResetPasswordPage } from './reset-password/reset-password-page';
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
    path: 'forgot-password',
    component: ForgotPasswordPage,
    title: 'Reset your password · nmk',
  },
  {
    // The token arrives as `?token=`, a query parameter rather than a path segment, so that a
    // truncated link still resolves to this route and can explain itself instead of 404ing.
    path: 'reset-password',
    component: ResetPasswordPage,
    title: 'Choose a new password · nmk',
  },
  {
    path: 'profile',
    component: ProfilePage,
    title: 'Your profile · nmk',
    canActivate: [authGuard],
  },
];
