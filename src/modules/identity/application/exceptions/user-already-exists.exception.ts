import { ApplicationException } from '@framework/application';
import { Email } from '@framework/domain';

export class UserAlreadyExists extends ApplicationException {
  private constructor(
    message: string,
    public readonly email: Email,
  ) {
    super(message);
  }

  public static withEmail(email: Email): UserAlreadyExists {
    return new UserAlreadyExists(
      `User already exists with email ${email.asString()}`,
      email,
    );
  }
}
