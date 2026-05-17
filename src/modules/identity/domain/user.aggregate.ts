import { AggregateRoot, Email, Identity } from '@framework/domain';
import { UserRegistered } from './events/user-registered.event';

export class User extends AggregateRoot {
  constructor(
    id: Identity,
    private email: Email,
    private password: string,
    private firstName: string,
    private lastName: string,
  ) {
    super(id);
  }

  public static register(
    email: Email,
    password: string,
    firstName: string,
    lastName: string,
  ): User {
    const user = new User(Identity.new(), email, password, firstName, lastName);
    user.recordThat(new UserRegistered(user.id.asString(), email.asString()));
    return user;
  }

  public getPassword(): string {
    return this.password;
  }

  public toPrimitives(): object {
    return {
      id: this.id.asString(),
      email: this.email.asString(),
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
    };
  }
}
