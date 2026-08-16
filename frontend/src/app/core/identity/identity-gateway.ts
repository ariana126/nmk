import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';

import { AuthService } from '../../api/auth/auth.service';
import {
  LoginUserDto,
  RegisterUserDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from '../../api/model';
import { PasswordResetsService } from '../../api/password-resets/password-resets.service';
import { UsersService } from '../../api/users/users.service';
import { anonymous } from '../http/auth-context';
import { SessionStore } from './session-store';
import { toUserProfile, UserProfile } from './user-profile';

/** A 200 from login that carried no token. A broken server, not a user error. */
export class MissingAccessTokenError extends Error {}

/**
 * The app's one way in and out of the identity API.
 *
 * It wraps the generated services rather than replacing them: the generated code owns the routes and
 * the payload shapes, and this owns the two things it cannot know — which calls go out anonymously,
 * and what happens to the token that comes back.
 *
 * Taking `RegisterUserDto` and `LoginUserDto` (the generated types) is deliberate. The backend's
 * validation pipe runs `forbidNonWhitelisted`, so a single stray property is a 400; typing the
 * parameters as the DTOs makes the compiler the thing that prevents it, rather than a stripping step
 * someone has to remember.
 */
@Injectable({ providedIn: 'root' })
export class IdentityGateway {
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly passwordResets = inject(PasswordResetsService);
  private readonly session = inject(SessionStore);

  async signUp(details: RegisterUserDto): Promise<void> {
    await firstValueFrom(this.users.userControllerRegister(details, { context: anonymous() }), {
      // A 201 with an empty body can complete without ever emitting, which `firstValueFrom` would
      // otherwise reject with `EmptyError` — turning the success case into a thrown error.
      defaultValue: undefined,
    });
  }

  async logIn(credentials: LoginUserDto): Promise<void> {
    const response = await firstValueFrom(
      this.auth.authControllerLogin(credentials, { context: anonymous() }),
    );

    // `accessToken` is optional in the contract. A 200 without one leaves us unable to authenticate
    // anything, so fail loudly here rather than storing an empty string and looking logged in.
    if (response.accessToken === undefined || response.accessToken === '') {
      throw new MissingAccessTokenError('Login succeeded but returned no access token');
    }

    this.session.store(response.accessToken);
  }

  /**
   * Asks the API to send a reset link to `details.email`.
   *
   * Anonymous for the obvious reason: the person calling this cannot log in. Sending a stale token
   * along would also route a 401 into the interceptor's "your session expired" redirect, throwing
   * the visitor off the very page they are trying to use.
   */
  async requestPasswordReset(details: RequestPasswordResetDto): Promise<void> {
    await firstValueFrom(
      this.passwordResets.passwordResetControllerRequest(details, { context: anonymous() }),
      // A 201 with an empty body completes without emitting, which `firstValueFrom` would otherwise
      // reject with `EmptyError` — turning success into a thrown error.
      { defaultValue: undefined },
    );
  }

  /**
   * Spends a reset link on a new password.
   *
   * It stores nothing: a successful reset deliberately leaves the visitor logged out, so they prove
   * the new password works by using it. Do not "helpfully" log them in here.
   *
   * The token comes off the address bar and the generated client interpolates it into the path
   * unescaped, so a `/` or `?` in it would silently address a different route. Encoding it here —
   * at the one place that knows the value is a single path segment — is what stops that.
   */
  async resetPassword(token: string, details: ResetPasswordDto): Promise<void> {
    await firstValueFrom(
      this.passwordResets.passwordResetControllerReset(encodeURIComponent(token), details, {
        context: anonymous(),
      }),
      { defaultValue: undefined },
    );
  }

  profile(): Observable<UserProfile> {
    return this.users.userControllerProfile().pipe(map(toUserProfile));
  }

  logOut(): void {
    this.session.clear();
  }
}
