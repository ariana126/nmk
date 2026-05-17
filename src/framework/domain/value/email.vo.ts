import { ValueObject } from '../value-object';

export class Email extends ValueObject {
  private constructor(private readonly value: string) {
    super();
  }

  static fromString(email: string): Email {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    return new Email(normalized);
  }

  public asString(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
