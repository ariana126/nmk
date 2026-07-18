import { Identity } from '../value/identity.vo';
import { DomainException } from './domain.exception';

export class EntityNotFound extends DomainException {
  private constructor(
    message: string,
    public readonly identifier: Identity,
  ) {
    super(message);
  }

  public static withId(id: Identity): EntityNotFound {
    return new EntityNotFound(`Entity not found with id ${id.asString()}`, id);
  }
}
