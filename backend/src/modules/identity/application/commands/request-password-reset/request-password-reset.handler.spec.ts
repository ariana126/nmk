import { Clock, Email, EntityNotFound, Identity } from '@framework/domain';
import { UserNotFound } from '@identity/application/exceptions';
import { PasswordResetNotifier } from '@identity/domain/service/password-reset-notifier';
import { PasswordResetTokenGenerator } from '@identity/domain/service/password-reset-token-generator';
import { UserRepository } from '@identity/domain/service/user.repository';
import { User } from '@identity/domain/user.aggregate';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';

import { RequestPasswordResetCommand } from './request-password-reset.command';
import { RequestPasswordResetHandler } from './request-password-reset.handler';

const NOW = new Date('2026-01-01T10:00:00.000Z');
const REGISTERED_AT = new Date('2026-01-01T09:00:00.000Z');
const SECRET = 'the-secret-in-the-link';
const ORIGINAL_HASH = 'hash-of-the-original';

interface UserRow {
  email: string;
  passwordResetToken: string | null;
}

class InMemoryUserRepository extends UserRepository {
  public readonly saved: User[] = [];

  constructor(private readonly users: User[] = []) {
    super();
  }

  find(id: Identity): Promise<User | null> {
    return Promise.resolve(
      this.users.find((user) => user.id.equals(id)) ?? null,
    );
  }

  async get(id: Identity): Promise<User> {
    const user = await this.find(id);
    if (!user) throw EntityNotFound.withId(id);
    return user;
  }

  save(user: User): Promise<void> {
    if (!this.users.includes(user)) this.users.push(user);
    this.saved.push(user);
    return Promise.resolve();
  }

  findByEmail(email: Email): Promise<User | null> {
    return Promise.resolve(
      this.matching((row) => row.email === email.asString()),
    );
  }

  findByPasswordResetToken(token: PasswordResetToken): Promise<User | null> {
    return Promise.resolve(
      this.matching((row) => row.passwordResetToken === token.asString()),
    );
  }

  private matching(predicate: (row: UserRow) => boolean): User | null {
    return (
      this.users.find((user) => predicate(user.toPrimitives() as UserRow)) ??
      null
    );
  }
}

class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return new Date(this.instant);
  }
}

class StubTokenGenerator extends PasswordResetTokenGenerator {
  constructor(private readonly secret: string) {
    super();
  }

  generateSecret(): string {
    return this.secret;
  }

  digest(secret: string): PasswordResetToken {
    return PasswordResetToken.fromDigest(`digest(${secret})`);
  }
}

class RecordingNotifier extends PasswordResetNotifier {
  public readonly notifications: { recipient: string; secret: string }[] = [];

  notify(recipient: Email, secret: string): Promise<void> {
    this.notifications.push({ recipient: recipient.asString(), secret });
    return Promise.resolve();
  }
}

function aRegisteredUser(email = 'ada@example.com'): User {
  return User.register(
    Email.fromString(email),
    ORIGINAL_HASH,
    'Ada',
    'Lovelace',
    REGISTERED_AT,
  );
}

function createHandler(users: User[] = []) {
  const repository = new InMemoryUserRepository(users);
  const notifier = new RecordingNotifier();
  const sut = new RequestPasswordResetHandler(
    repository,
    new StubTokenGenerator(SECRET),
    notifier,
    new FixedClock(NOW),
  );
  return { sut, repository, notifier };
}

describe('RequestPasswordResetHandler', () => {
  it('an email nobody registered with is rejected', async () => {
    const { sut } = createHandler([aRegisteredUser('ada@example.com')]);

    await expect(
      sut.execute(
        new RequestPasswordResetCommand(Email.fromString('nobody@example.com')),
      ),
    ).rejects.toThrow(UserNotFound);
  });

  it('the secret is sent to the address the reset was requested for', async () => {
    const { sut, notifier } = createHandler([aRegisteredUser()]);

    await sut.execute(
      new RequestPasswordResetCommand(Email.fromString('ada@example.com')),
    );

    expect(notifier.notifications).toEqual([
      { recipient: 'ada@example.com', secret: SECRET },
    ]);
  });

  it('the user is saved holding the digest of the secret, never the secret itself', async () => {
    const { sut, repository } = createHandler([aRegisteredUser()]);

    await sut.execute(
      new RequestPasswordResetCommand(Email.fromString('ada@example.com')),
    );

    expect(repository.saved).toHaveLength(1);
    await expect(
      repository.findByPasswordResetToken(
        PasswordResetToken.fromDigest(`digest(${SECRET})`),
      ),
    ).resolves.not.toBeNull();
    await expect(
      repository.findByPasswordResetToken(
        PasswordResetToken.fromDigest(SECRET),
      ),
    ).resolves.toBeNull();
  });

  it('an unknown email leaves nothing saved and nothing sent', async () => {
    const { sut, repository, notifier } = createHandler([aRegisteredUser()]);

    await expect(
      sut.execute(
        new RequestPasswordResetCommand(Email.fromString('nobody@example.com')),
      ),
    ).rejects.toThrow(UserNotFound);
    expect(repository.saved).toEqual([]);
    expect(notifier.notifications).toEqual([]);
  });
});
