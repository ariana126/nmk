import { DomainException } from '@framework/domain';

export class PasswordResetAlreadyUsed extends DomainException {
  private constructor(
    message: string,
    public readonly usedAt: Date,
  ) {
    super(message);
  }

  public static at(usedAt: Date): PasswordResetAlreadyUsed {
    return new PasswordResetAlreadyUsed(
      `Password reset link was already used at ${usedAt.toISOString()}`,
      usedAt,
    );
  }
}
