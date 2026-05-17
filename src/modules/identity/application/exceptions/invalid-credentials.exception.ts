import { ApplicationException } from '@framework/application';

export class InvalidCredentials extends ApplicationException {
  public static provided(): InvalidCredentials {
    return new InvalidCredentials('Invalid credentials provided.');
  }
}
