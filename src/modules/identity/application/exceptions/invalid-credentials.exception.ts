import { ApplicationException } from '@framework/application';

export const INVALID_CREDENTIALS_ERROR_CODE = 'InvalidCredentials';

export class InvalidCredentials extends ApplicationException {
  private constructor(message: string) {
    super(message, INVALID_CREDENTIALS_ERROR_CODE);
  }

  public static provided(): InvalidCredentials {
    return new InvalidCredentials('Invalid credentials provided.');
  }
}
