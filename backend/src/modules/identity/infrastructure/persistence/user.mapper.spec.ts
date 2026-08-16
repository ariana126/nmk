import { Email } from '@framework/domain';
import { PasswordResetAlreadyUsed } from '@identity/domain/exception/password-reset-already-used.exception';
import { PasswordResetExpired } from '@identity/domain/exception/password-reset-expired.exception';
import { User } from '@identity/domain/user.aggregate';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';
import { User as PrismaUser } from '@prisma/client';

import { UserMapper } from './user.mapper';

const REGISTERED_AT = new Date('2026-01-01T09:00:00.000Z');
const REQUESTED_AT = new Date('2026-01-01T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-01-01T11:00:00.000Z');
const FIFTY_NINE_MINUTES_LATER = new Date('2026-01-01T10:59:00.000Z');
const TWO_HOURS_LATER = new Date('2026-01-01T12:00:00.000Z');

const NEW_PASSWORD = 'hashed-new-password';

function aRow(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'ada@example.com',
    password: 'hashed-original-password',
    firstName: 'Ada',
    lastName: 'Lovelace',
    registeredAt: REGISTERED_AT,
    passwordResetToken: null,
    passwordResetRequestedAt: null,
    passwordResetExpiresAt: null,
    passwordResetRedeemedAt: null,
    ...overrides,
  };
}

function aPendingResetRow(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return aRow({
    passwordResetToken: 'token-digest',
    passwordResetRequestedAt: REQUESTED_AT,
    passwordResetExpiresAt: EXPIRES_AT,
    ...overrides,
  });
}

describe('UserMapper', () => {
  describe('reading a user back', () => {
    it('a user who never asked for a reset comes back with none pending', () => {
      const user = UserMapper.toDomain(aRow());

      expect(() => user.resetPassword(NEW_PASSWORD, REQUESTED_AT)).toThrow(
        'no pending password reset',
      );
    });

    it('a stored reset can still be redeemed before its deadline', () => {
      const user = UserMapper.toDomain(aPendingResetRow());

      user.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(user.getPassword()).toBe(NEW_PASSWORD);
    });

    it('a stored reset keeps the deadline it was issued with, not a fresh one', () => {
      const user = UserMapper.toDomain(aPendingResetRow());

      expect(() => user.resetPassword(NEW_PASSWORD, TWO_HOURS_LATER)).toThrow(
        PasswordResetExpired,
      );
    });

    it('a reset already redeemed comes back knowing it was used', () => {
      const user = UserMapper.toDomain(
        aPendingResetRow({ passwordResetRedeemedAt: FIFTY_NINE_MINUTES_LATER }),
      );

      expect(() =>
        user.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER),
      ).toThrow(PasswordResetAlreadyUsed);
    });
  });

  describe('writing a user out', () => {
    it('a user with no pending reset leaves every reset column empty', () => {
      const user = User.register(
        Email.fromString('ada@example.com'),
        'hashed-original-password',
        'Ada',
        'Lovelace',
        REGISTERED_AT,
      );

      expect(UserMapper.toPersistence(user)).toMatchObject({
        email: 'ada@example.com',
        registeredAt: REGISTERED_AT,
        passwordResetToken: null,
        passwordResetRequestedAt: null,
        passwordResetExpiresAt: null,
        passwordResetRedeemedAt: null,
      });
    });

    it('a requested reset is written out with its digest and its deadline', () => {
      const user = UserMapper.toDomain(aRow());

      user.requestPasswordReset(
        PasswordResetToken.fromDigest('token-digest'),
        REQUESTED_AT,
      );

      expect(UserMapper.toPersistence(user)).toMatchObject({
        passwordResetToken: 'token-digest',
        passwordResetRequestedAt: REQUESTED_AT,
        passwordResetExpiresAt: EXPIRES_AT,
        passwordResetRedeemedAt: null,
      });
    });

    it('a redeemed reset is written out rather than cleared', () => {
      const user = UserMapper.toDomain(aPendingResetRow());

      user.resetPassword(NEW_PASSWORD, FIFTY_NINE_MINUTES_LATER);

      expect(UserMapper.toPersistence(user)).toMatchObject({
        password: NEW_PASSWORD,
        passwordResetToken: 'token-digest',
        passwordResetRedeemedAt: FIFTY_NINE_MINUTES_LATER,
      });
    });

    it('a row survives a round trip through the domain unchanged', () => {
      const row = aPendingResetRow({
        passwordResetRedeemedAt: FIFTY_NINE_MINUTES_LATER,
      });

      expect(UserMapper.toPersistence(UserMapper.toDomain(row))).toEqual(row);
    });
  });
});
