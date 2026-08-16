import { Email, Identity } from '@framework/domain';
import { User } from '@identity/domain/user.aggregate';
import { PasswordReset } from '@identity/domain/value/password-reset.vo';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';
import { User as PrismaUser } from '@prisma/client';

/**
 * The shape `User.toPrimitives()` produces. The aggregate types that method as
 * `object`, so naming the shape here is what ties the two sides together: the
 * explicit record built in `toPersistence` then fails to compile if a column
 * appears in the Prisma model and nowhere else.
 */
interface UserPrimitives {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  registeredAt: Date;
  passwordResetToken: string | null;
  passwordResetRequestedAt: Date | null;
  passwordResetExpiresAt: Date | null;
  passwordResetRedeemedAt: Date | null;
}

export class UserMapper {
  public static toDomain(prismaUser: PrismaUser): User {
    return new User(
      Identity.fromString(prismaUser.id),
      Email.fromString(prismaUser.email),
      prismaUser.password,
      prismaUser.firstName,
      prismaUser.lastName,
      prismaUser.registeredAt,
      UserMapper.toPasswordReset(prismaUser),
    );
  }

  public static toPersistence(user: User): PrismaUser {
    const primitives = user.toPrimitives() as UserPrimitives;
    return {
      id: primitives.id,
      email: primitives.email,
      password: primitives.password,
      firstName: primitives.firstName,
      lastName: primitives.lastName,
      registeredAt: primitives.registeredAt,
      passwordResetToken: primitives.passwordResetToken,
      passwordResetRequestedAt: primitives.passwordResetRequestedAt,
      passwordResetExpiresAt: primitives.passwordResetExpiresAt,
      passwordResetRedeemedAt: primitives.passwordResetRedeemedAt,
    };
  }

  /**
   * A reset is rebuilt only when the columns that make one meaningful are all
   * present; a redeemed reset is still rebuilt, so reusing its link resolves to
   * this user and is answered "already used" rather than "unknown".
   */
  private static toPasswordReset(prismaUser: PrismaUser): PasswordReset | null {
    const { passwordResetToken, passwordResetRequestedAt } = prismaUser;
    const { passwordResetExpiresAt, passwordResetRedeemedAt } = prismaUser;

    if (
      passwordResetToken === null ||
      passwordResetRequestedAt === null ||
      passwordResetExpiresAt === null
    ) {
      return null;
    }

    return PasswordReset.restore(
      PasswordResetToken.fromDigest(passwordResetToken),
      passwordResetRequestedAt,
      passwordResetExpiresAt,
      passwordResetRedeemedAt,
    );
  }
}
