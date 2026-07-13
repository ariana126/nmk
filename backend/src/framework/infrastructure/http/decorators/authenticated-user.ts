import { Identity } from '@framework/domain';

export class AuthenticatedUser {
  constructor(public readonly id: Identity) {}
}
