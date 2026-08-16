import { DomainEvent } from '@framework/domain';

export class PasswordWasReset implements DomainEvent {
  constructor(public readonly userId: string) {}
}
