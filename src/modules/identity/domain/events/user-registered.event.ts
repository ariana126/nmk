import { DomainEvent } from '@framework/domain';

export class UserRegistered implements DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
