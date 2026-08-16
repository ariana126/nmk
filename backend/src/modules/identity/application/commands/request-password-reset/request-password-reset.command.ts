import { Email } from '@framework/domain';

export class RequestPasswordResetCommand {
  constructor(public readonly email: Email) {}
}
