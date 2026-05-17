import { Email } from '@framework/domain';

export class RegisterUserCommand {
  constructor(
    public readonly email: Email,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
  ) {}
}
