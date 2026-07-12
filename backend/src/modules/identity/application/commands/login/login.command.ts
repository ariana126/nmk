import { Email } from '@framework/domain';

export class LoginCommand {
  constructor(
    public readonly email: Email,
    public readonly password: string,
  ) {}
}
