import { DomainEvent } from '@framework/domain';

export class PasswordResetRequested implements DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
