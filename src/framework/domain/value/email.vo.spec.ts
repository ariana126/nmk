import { Email } from './email.vo';

describe('Email', () => {
  it('a valid email address is accepted', () => {
    const sut = Email.fromString('user@example.com');
    expect(sut.asString()).toBe('user@example.com');
  });

  it('email is normalized to lowercase and surrounding whitespace is stripped', () => {
    const sut = Email.fromString('  User@Example.COM  ');
    expect(sut.asString()).toBe('user@example.com');
  });

  it('an address without @ is rejected', () => {
    expect(() => Email.fromString('notanemail')).toThrow();
  });

  it('an address without a domain is rejected', () => {
    expect(() => Email.fromString('user@')).toThrow();
  });

  it('an empty string is rejected', () => {
    expect(() => Email.fromString('')).toThrow();
  });

  it('two email objects with the same address are equal', () => {
    const sut = Email.fromString('user@example.com');
    const other = Email.fromString('user@example.com');
    expect(sut.equals(other)).toBe(true);
  });

  it('two email objects with different addresses are not equal', () => {
    const sut = Email.fromString('a@example.com');
    const other = Email.fromString('b@example.com');
    expect(sut.equals(other)).toBe(false);
  });
});
