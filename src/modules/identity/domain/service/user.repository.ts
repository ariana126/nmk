import { Email, EntityRepository } from '@framework/domain';
import { User } from '@identity/domain/user.aggregate';

export abstract class UserRepository extends EntityRepository<User> {
  public abstract findByEmail(email: Email): Promise<User | null>;
}
