import { ApplicationException } from '@framework/application';
import { Email } from '@framework/domain';

export const USER_ALREADY_EXISTS_ERROR_CODE = 'UserAlreadyExists';

export class UserAlreadyExists extends ApplicationException {
  private constructor(message: string) {
    super(message, USER_ALREADY_EXISTS_ERROR_CODE);
  }

  public static withEmail(email: Email): UserAlreadyExists {
    return new UserAlreadyExists(
      `User already exists with email ${email.asString()}`,
    );
  }
}
