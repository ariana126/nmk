import { ValueObject } from '@framework/domain';

import { PasswordResetAlreadyUsed } from '../exception/password-reset-already-used.exception';
import { PasswordResetExpired } from '../exception/password-reset-expired.exception';
import { PasswordResetToken } from './password-reset-token.vo';

/** A reset link is good for one hour from the moment it was requested. */
const TIME_TO_LIVE_IN_MILLISECONDS = 60 * 60 * 1000;

/**
 * A password reset that a user has asked for and not yet consumed. It is a
 * value, not an entity: it is always replaced wholesale — by a fresh request,
 * or by a redeemed copy of itself — and never mutated in place.
 *
 * `expiresAt` is stored rather than derived so that a link keeps the deadline it
 * was issued with, whatever the time-to-live becomes later.
 */
export class PasswordReset extends ValueObject {
  private constructor(
    private readonly token: PasswordResetToken,
    private readonly requestedAt: Date,
    private readonly expiresAt: Date,
    private readonly redeemedAt: Date | null,
  ) {
    super();
  }

  public static request(
    token: PasswordResetToken,
    requestedAt: Date,
  ): PasswordReset {
    return new PasswordReset(
      token,
      new Date(requestedAt),
      new Date(requestedAt.getTime() + TIME_TO_LIVE_IN_MILLISECONDS),
      null,
    );
  }

  /** Rebuilds a reset that was previously persisted. */
  public static restore(
    token: PasswordResetToken,
    requestedAt: Date,
    expiresAt: Date,
    redeemedAt: Date | null,
  ): PasswordReset {
    return new PasswordReset(
      token,
      new Date(requestedAt),
      new Date(expiresAt),
      redeemedAt === null ? null : new Date(redeemedAt),
    );
  }

  /**
   * Consumes the link, returning the redeemed copy. Being already used is
   * checked before expiry: it is the more actionable of the two facts, and a
   * link that was used and then expired should say so.
   */
  public redeem(now: Date): PasswordReset {
    if (this.redeemedAt !== null) {
      throw PasswordResetAlreadyUsed.at(this.redeemedAt);
    }
    if (now.getTime() >= this.expiresAt.getTime()) {
      throw PasswordResetExpired.at(this.expiresAt);
    }
    return new PasswordReset(
      this.token,
      this.requestedAt,
      this.expiresAt,
      new Date(now),
    );
  }

  public toPrimitives(): {
    token: string;
    requestedAt: Date;
    expiresAt: Date;
    redeemedAt: Date | null;
  } {
    return {
      token: this.token.asString(),
      requestedAt: new Date(this.requestedAt),
      expiresAt: new Date(this.expiresAt),
      redeemedAt: this.redeemedAt === null ? null : new Date(this.redeemedAt),
    };
  }
}
