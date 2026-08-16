import { AggregateRoot, Email, Identity } from '@framework/domain';

import { PasswordResetRequested } from './events/password-reset-requested.event';
import { PasswordWasReset } from './events/password-was-reset.event';
import { UserRegistered } from './events/user-registered.event';
import { PasswordReset } from './value/password-reset.vo';
import { PasswordResetToken } from './value/password-reset-token.vo';

export class User extends AggregateRoot {
  constructor(
    id: Identity,
    private email: Email,
    private password: string,
    private firstName: string,
    private lastName: string,
    private registeredAt: Date,
    private pendingPasswordReset: PasswordReset | null,
  ) {
    super(id);
  }

  public static register(
    email: Email,
    password: string,
    firstName: string,
    lastName: string,
    registeredAt: Date,
  ): User {
    const user = new User(
      Identity.new(),
      email,
      password,
      firstName,
      lastName,
      registeredAt,
      null,
    );
    user.recordThat(new UserRegistered(user.id.asString(), email.asString()));
    return user;
  }

  /**
   * Asks for a reset link. A new request supersedes any earlier one, so only
   * the most recently issued link can still be redeemed.
   */
  public requestPasswordReset(token: PasswordResetToken, now: Date): void {
    this.pendingPasswordReset = PasswordReset.request(token, now);
    this.recordThat(
      new PasswordResetRequested(this.id.asString(), this.email.asString()),
    );
  }

  /**
   * Redeems the pending link and changes the password in one step — consuming
   * the link is what authorises the change, which is why the two cannot happen
   * separately. The redeemed reset is kept rather than cleared, so a second
   * attempt with the same link still resolves to this user and is told it was
   * already used.
   *
   * The caller is expected to have found this user *by* its pending token, so
   * there being none is a programming error rather than a user-facing case.
   */
  public resetPassword(hashedPassword: string, now: Date): void {
    if (this.pendingPasswordReset === null) {
      throw new Error(
        `User ${this.id.asString()} has no pending password reset to redeem`,
      );
    }

    this.pendingPasswordReset = this.pendingPasswordReset.redeem(now);
    this.password = hashedPassword;
    this.recordThat(new PasswordWasReset(this.id.asString()));
  }

  public getPassword(): string {
    return this.password;
  }

  public toPrimitives(): object {
    const passwordReset = this.pendingPasswordReset?.toPrimitives() ?? null;
    return {
      id: this.id.asString(),
      email: this.email.asString(),
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      registeredAt: this.registeredAt,
      passwordResetToken: passwordReset?.token ?? null,
      passwordResetRequestedAt: passwordReset?.requestedAt ?? null,
      passwordResetExpiresAt: passwordReset?.expiresAt ?? null,
      passwordResetRedeemedAt: passwordReset?.redeemedAt ?? null,
    };
  }
}
