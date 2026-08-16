import { ValueObject } from '@framework/domain';

/**
 * The stored, one-way digest of a password reset secret. The secret itself
 * travels to the user by email and is never persisted; what a repository looks
 * up, and what an aggregate holds, is always this digest.
 */
export class PasswordResetToken extends ValueObject {
  private constructor(private readonly value: string) {
    super();
  }

  public static fromDigest(digest: string): PasswordResetToken {
    if (!digest.trim()) {
      throw new Error('Password reset token must not be empty');
    }
    return new PasswordResetToken(digest);
  }

  public asString(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
