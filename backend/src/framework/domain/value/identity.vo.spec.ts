import { Identity } from './identity.vo';

describe('Identity', () => {
  it('a new identity has a valid UUID format', () => {
    const sut = Identity.new();
    expect(sut.asString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('each new identity is unique', () => {
    const a = Identity.new();
    const b = Identity.new();
    expect(a.asString()).not.toBe(b.asString());
  });

  it('an identity created from a string preserves the provided value', () => {
    const sut = Identity.fromString('abc-123');
    expect(sut.asString()).toBe('abc-123');
  });

  it('an empty string is rejected', () => {
    expect(() => Identity.fromString('')).toThrow();
  });

  it('a whitespace-only string is rejected', () => {
    expect(() => Identity.fromString('   ')).toThrow();
  });

  it('two identities with the same value are equal', () => {
    const sut = Identity.fromString('abc-123');
    const other = Identity.fromString('abc-123');
    expect(sut.equals(other)).toBe(true);
  });

  it('two identities with different values are not equal', () => {
    const sut = Identity.fromString('abc-123');
    const other = Identity.fromString('xyz-456');
    expect(sut.equals(other)).toBe(false);
  });
});
