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

  it('an address without a local part is rejected', () => {
    expect(() => Email.fromString('@example.com')).toThrow();
  });

  it('a domain without a dot is rejected', () => {
    expect(() => Email.fromString('user@example')).toThrow();
  });

  it.each(['user@.example.com', 'user@example.com.', 'user@example..com'])(
    'a domain with an empty label is rejected: %s',
    (email) => {
      expect(() => Email.fromString(email)).toThrow();
    },
  );

  it('an address with more than one @ is rejected', () => {
    expect(() => Email.fromString('user@@example.com')).toThrow();
  });

  it('an address with interior whitespace is rejected', () => {
    expect(() => Email.fromString('us er@example.com')).toThrow();
  });

  it('a domain with more than two labels is accepted', () => {
    const sut = Email.fromString('user@mail.example.co.uk');
    expect(sut.asString()).toBe('user@mail.example.co.uk');
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
