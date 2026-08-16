import { ApplicationException } from '@framework/application';

export class PasswordResetNotFound extends ApplicationException {
  private constructor(message: string) {
    super(message);
  }

  public static forUnknownToken(): PasswordResetNotFound {
    return new PasswordResetNotFound(
      'No password reset matches the link that was used',
    );
  }
}
