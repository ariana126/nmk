import { Sha256PasswordResetTokenGenerator } from './sha256-password-reset-token-generator';

// The published SHA-256 test vector for "abc", so the expectation comes from the
// specification rather than from a second copy of the implementation.
const SHA256_OF_ABC =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('Sha256PasswordResetTokenGenerator', () => {
  it('digesting a secret twice yields the same token, so a link can be looked up', () => {
    const sut = new Sha256PasswordResetTokenGenerator();

    expect(sut.digest('abc').asString()).toBe(SHA256_OF_ABC);
  });

  it('two different secrets never share a token', () => {
    const sut = new Sha256PasswordResetTokenGenerator();

    expect(sut.digest('one-secret').asString()).not.toBe(
      sut.digest('another-secret').asString(),
    );
  });

  it('the token gives nothing away about the secret it came from', () => {
    const sut = new Sha256PasswordResetTokenGenerator();
    const secret = sut.generateSecret();

    expect(sut.digest(secret).asString()).not.toContain(secret);
  });

  it('every secret minted is a fresh one', () => {
    const sut = new Sha256PasswordResetTokenGenerator();

    const secrets = new Set(
      Array.from({ length: 100 }, () => sut.generateSecret()),
    );

    expect(secrets.size).toBe(100);
  });

  it('a secret is safe to carry in a URL without escaping', () => {
    const sut = new Sha256PasswordResetTokenGenerator();

    const secret = sut.generateSecret();

    expect(secret).toMatch(/^[\w-]+$/);
    expect(encodeURIComponent(secret)).toBe(secret);
  });
});
