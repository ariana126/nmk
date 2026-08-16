import { Email } from '@framework/domain';

import { PasswordResetRequested } from './events/password-reset-requested.event';
import { PasswordWasReset } from './events/password-was-reset.event';
import { UserRegistered } from './events/user-registered.event';
import { PasswordResetAlreadyUsed } from './exception/password-reset-already-used.exception';
import { PasswordResetExpired } from './exception/password-reset-expired.exception';
import { User } from './user.aggregate';
import { PasswordResetToken } from './value/password-reset-token.vo';

const REGISTERED_AT = new Date('2026-01-01T09:00:00.000Z');
const REQUESTED_AT = new Date('2026-01-01T10:00:00.000Z');
const FIFTY_NINE_MINUTES_LATER = new Date('2026-01-01T10:59:00.000Z');
const ONE_HOUR_LATER = new Date('2026-01-01T11:00:00.000Z');
const TWO_HOURS_LATER = new Date('2026-01-01T12:00:00.000Z');

const ORIGINAL_PASSWORD = 'hashed-original-password';
const NEW_PASSWORD = 'hashed-new-password';

function aRegisteredUser(): User {
  const user = User.register(
    Email.fromString('ada@example.com'),
    ORIGINAL_PASSWORD,
    'Ada',
    'Lovelace',
    REGISTERED_AT,
  );
  user.releaseEvents();
  return user;
}

function aToken(digest = 'token-digest'): PasswordResetToken {
  return PasswordResetToken.fromDigest(digest);
}

describe('User', () => {
  it('registering a user records that they registered', () => {
    const sut = User.register(
      Email.fromString('ada@example.com'),
      ORIGINAL_PASSWORD,
      'Ada',
      'Lovelace',
      REGISTERED_AT,
    );

    expect(sut.releaseEvents()).toEqual([
      new UserRegistered(sut.id.asString(), 'ada@example.com'),
    ]);
  });

  describe('requesting a password reset', () => {
    it('records that a password reset was requested', () => {
      const sut = aRegisteredUser();

      sut.requestPasswordReset(aToken(), REQUESTED_AT);

      expect(sut.releaseEvents()).toEqual([
        new PasswordResetRequested(sut.id.asString(), 'ada@example.com'),
      ]);
    });

    it('a second request supersedes the first, so the deadline moves with it', () => {
      // Arrange — the first link expires at 11:00, the second at 11:59.
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken('first'), REQUESTED_AT);
      sut.requestPasswordReset(aToken('second'), FIFTY_NINE_MINUTES_LATER);

      // Act — past the first link's deadline, within the second's.
      sut.resetPassword(NEW_PASSWORD, ONE_HOUR_LATER);

      // Assert
      expect(sut.getPassword()).toBe(NEW_PASSWORD);
    });

    it('a second request replaces the token the first one stored', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken('first'), REQUESTED_AT);

      sut.requestPasswordReset(aToken('second'), FIFTY_NINE_MINUTES_LATER);

      expect(sut.toPrimitives()).toMatchObject({
        passwordResetToken: 'second',
      });
    });
  });

  describe('resetting the password', () => {
    it('a link redeemed 59 minutes after it was requested changes the password', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);

      sut.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(sut.getPassword()).toBe(NEW_PASSWORD);
    });

    it('records that the password was reset', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);
      sut.releaseEvents();

      sut.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(sut.releaseEvents()).toEqual([
        new PasswordWasReset(sut.id.asString()),
      ]);
    });

    it('a link redeemed exactly one hour after it was requested has expired', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);

      expect(() => sut.resetPassword(NEW_PASSWORD, ONE_HOUR_LATER)).toThrow(
        PasswordResetExpired,
      );
    });

    it('a link redeemed two hours after it was requested has expired', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);

      expect(() => sut.resetPassword(NEW_PASSWORD, TWO_HOURS_LATER)).toThrow(
        PasswordResetExpired,
      );
    });

    it('an expired link leaves the password untouched and records nothing', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);
      sut.releaseEvents();

      expect(() => sut.resetPassword(NEW_PASSWORD, TWO_HOURS_LATER)).toThrow(
        PasswordResetExpired,
      );
      expect(sut.getPassword()).toBe(ORIGINAL_PASSWORD);
      expect(sut.releaseEvents()).toEqual([]);
    });

    it('a link that has already been redeemed cannot be redeemed again', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);
      sut.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(() =>
        sut.resetPassword('hashed-third-password', FIFTY_NINE_MINUTES_LATER),
      ).toThrow(PasswordResetAlreadyUsed);
    });

    it('a link that was used and has since expired reports being used, not expired', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);
      sut.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(() =>
        sut.resetPassword('hashed-third-password', TWO_HOURS_LATER),
      ).toThrow(PasswordResetAlreadyUsed);
    });

    it('a used link keeps its redemption on record so it can still be recognised', () => {
      const sut = aRegisteredUser();
      sut.requestPasswordReset(aToken(), REQUESTED_AT);

      sut.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(sut.toPrimitives()).toMatchObject({
        passwordResetToken: 'token-digest',
        passwordResetRedeemedAt: FIFTY_NINE_MINUTES_LATER,
      });
    });

    it('a user who never asked for a reset cannot redeem one', () => {
      const sut = aRegisteredUser();

      expect(() => sut.resetPassword(NEW_PASSWORD, REQUESTED_AT)).toThrow(
        'no pending password reset',
      );
    });
  });
});
