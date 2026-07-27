import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';

import { AuthService } from '../../api/auth/auth.service';
import { LoginUserDto, RegisterUserDto } from '../../api/model';
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

  profile(): Observable<UserProfile> {
    return this.users.userControllerProfile().pipe(map(toUserProfile));
  }

  logOut(): void {
    this.session.clear();
  }
}
