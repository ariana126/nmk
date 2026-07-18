import { AggregateRoot } from '../aggregate-root';
import { Identity } from '../value/identity.vo';

export abstract class EntityRepository<T extends AggregateRoot> {
  public abstract find(id: Identity): Promise<T | null>;
  public abstract get(id: Identity): Promise<T>;
  public abstract save(entity: T): Promise<void>;
}
