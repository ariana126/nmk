import { DomainException } from '@framework/domain';

export class PasswordResetExpired extends DomainException {
  private constructor(
    message: string,
    public readonly expiredAt: Date,
  ) {
    super(message);
  }

  public static at(expiredAt: Date): PasswordResetExpired {
    return new PasswordResetExpired(
      `Password reset link expired at ${expiredAt.toISOString()}`,
      expiredAt,
    );
  }
}
