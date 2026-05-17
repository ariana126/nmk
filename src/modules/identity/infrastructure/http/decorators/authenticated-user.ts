import { Identity } from '@framework/domain';

export class AuthenticatedUser {
  constructor(readonly id: Identity) {}
}
