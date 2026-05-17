import { DomainException, Identity } from '@framework/domain';

export const ENTITY_NOT_FOUND_ERROR_CODE = 'EntityNotFound';

export class EntityNotFound extends DomainException {
  private constructor(message: string) {
    super(message, ENTITY_NOT_FOUND_ERROR_CODE);
  }

  public static withId(id: Identity): EntityNotFound {
    return new EntityNotFound(`Entity not found with id ${id.asString()}`);
  }
}
