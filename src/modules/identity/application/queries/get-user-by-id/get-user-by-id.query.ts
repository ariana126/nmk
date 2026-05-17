import { Identity } from '@framework/domain';

export class GetUserByIdQuery {
  constructor(public readonly userId: Identity) {}
}
