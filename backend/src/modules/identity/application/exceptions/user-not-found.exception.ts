import { ApplicationException } from '@framework/application';
import { Email } from '@framework/domain';

export class UserNotFound extends ApplicationException {
  private constructor(
    message: string,
    public readonly email: Email,
  ) {
    super(message);
  }

  public static withEmail(email: Email): UserNotFound {
    return new UserNotFound(
      `No user found with email ${email.asString()}`,
      email,
    );
  }
}
