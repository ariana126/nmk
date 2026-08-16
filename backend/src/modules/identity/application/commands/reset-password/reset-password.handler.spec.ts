import { Clock, Email, EntityNotFound, Identity } from '@framework/domain';
import { PasswordResetNotFound } from '@identity/application/exceptions';
import { PasswordResetAlreadyUsed } from '@identity/domain/exception/password-reset-already-used.exception';
import { PasswordResetExpired } from '@identity/domain/exception/password-reset-expired.exception';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { PasswordResetTokenGenerator } from '@identity/domain/service/password-reset-token-generator';
import { UserRepository } from '@identity/domain/service/user.repository';
import { User } from '@identity/domain/user.aggregate';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';

import { ResetPasswordCommand } from './reset-password.command';
import { ResetPasswordHandler } from './reset-password.handler';

const REGISTERED_AT = new Date('2026-01-01T09:00:00.000Z');
const REQUESTED_AT = new Date('2026-01-01T10:00:00.000Z');
const FIFTY_NINE_MINUTES_LATER = new Date('2026-01-01T10:59:00.000Z');
const TWO_HOURS_LATER = new Date('2026-01-01T12:00:00.000Z');

const SECRET = 'the-secret-in-the-link';
const ANOTHER_SECRET = 'a-newer-secret-in-a-newer-link';
const ORIGINAL_HASH = 'hash-of-the-original';
const CHOSEN_REPLACEMENT = 'N3w-cr3dential!';

const digestOf = (secret: string): PasswordResetToken =>
  PasswordResetToken.fromDigest(`digest(${secret})`);

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
  generateSecret(): string {
    return SECRET;
  }

  digest(secret: string): PasswordResetToken {
    return digestOf(secret);
  }
}

class PrefixingPasswordHasher extends PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed(${plain})`);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return Promise.resolve(hashed === `hashed(${plain})`);
  }
}

function aUserWithAPendingReset(
  secret = SECRET,
  requestedAt = REQUESTED_AT,
): User {
  const user = User.register(
    Email.fromString('ada@example.com'),
    ORIGINAL_HASH,
    'Ada',
    'Lovelace',
    REGISTERED_AT,
  );
  user.requestPasswordReset(digestOf(secret), requestedAt);
  return user;
}

function createHandler(now: Date, users: User[] = []) {
  const repository = new InMemoryUserRepository(users);
  const sut = new ResetPasswordHandler(
    repository,
    new StubTokenGenerator(),
    new PrefixingPasswordHasher(),
    new FixedClock(now),
  );
  return { sut, repository };
}

describe('ResetPasswordHandler', () => {
  it('a link nobody was issued is rejected', async () => {
    const { sut } = createHandler(FIFTY_NINE_MINUTES_LATER, [
      aUserWithAPendingReset(),
    ]);

    await expect(
      sut.execute(
        new ResetPasswordCommand('a-made-up-secret', CHOSEN_REPLACEMENT),
      ),
    ).rejects.toThrow(PasswordResetNotFound);
  });

  it('redeeming a valid link stores the hash of what the user chose', async () => {
    const user = aUserWithAPendingReset();
    const { sut, repository } = createHandler(FIFTY_NINE_MINUTES_LATER, [user]);

    await sut.execute(new ResetPasswordCommand(SECRET, CHOSEN_REPLACEMENT));

    expect(user.getPassword()).toBe(`hashed(${CHOSEN_REPLACEMENT})`);
    expect(repository.saved).toEqual([user]);
  });

  it('an expired link is rejected and nothing is saved', async () => {
    const user = aUserWithAPendingReset();
    const { sut, repository } = createHandler(TWO_HOURS_LATER, [user]);

    await expect(
      sut.execute(new ResetPasswordCommand(SECRET, CHOSEN_REPLACEMENT)),
    ).rejects.toThrow(PasswordResetExpired);
    expect(user.getPassword()).toBe(ORIGINAL_HASH);
    expect(repository.saved).toEqual([]);
  });

  it('a link that was already redeemed is rejected as used rather than unknown', async () => {
    const user = aUserWithAPendingReset();
    const { sut } = createHandler(FIFTY_NINE_MINUTES_LATER, [user]);
    await sut.execute(new ResetPasswordCommand(SECRET, CHOSEN_REPLACEMENT));

    await expect(
      sut.execute(new ResetPasswordCommand(SECRET, 'Yet-an0ther-cr3dential!')),
    ).rejects.toThrow(PasswordResetAlreadyUsed);
  });

  it('a link superseded by a later request no longer resolves to its user', async () => {
    const user = aUserWithAPendingReset();
    user.requestPasswordReset(digestOf(ANOTHER_SECRET), REQUESTED_AT);
    const { sut } = createHandler(FIFTY_NINE_MINUTES_LATER, [user]);

    await expect(
      sut.execute(new ResetPasswordCommand(SECRET, CHOSEN_REPLACEMENT)),
    ).rejects.toThrow(PasswordResetNotFound);
  });

  it('the link a later request issued is the one that works', async () => {
    const user = aUserWithAPendingReset();
    user.requestPasswordReset(digestOf(ANOTHER_SECRET), REQUESTED_AT);
    const { sut } = createHandler(FIFTY_NINE_MINUTES_LATER, [user]);

    await sut.execute(
      new ResetPasswordCommand(ANOTHER_SECRET, CHOSEN_REPLACEMENT),
    );

    expect(user.getPassword()).toBe(`hashed(${CHOSEN_REPLACEMENT})`);
  });
});
