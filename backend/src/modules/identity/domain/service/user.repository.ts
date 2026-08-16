import { Email, EntityRepository } from '@framework/domain';
import { User } from '@identity/domain/user.aggregate';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';

export abstract class UserRepository extends EntityRepository<User> {
  public abstract findByEmail(email: Email): Promise<User | null>;
  public abstract findByPasswordResetToken(
    token: PasswordResetToken,
  ): Promise<User | null>;
}
