import { ValueObject } from '../value-object';

export class Email extends ValueObject {
  private constructor(private readonly value: string) {
    super();
  }

  static fromString(email: string): Email {
    const normalized = email.trim().toLowerCase();
    if (!Email.isWellFormed(normalized)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    return new Email(normalized);
  }

  // One non-empty local part, an `@`, then a domain of two or more non-empty
  // dot-separated labels — with no whitespace anywhere.
  private static isWellFormed(email: string): boolean {
    const [local, domain, ...rest] = email.split('@');
    if (rest.length > 0 || !local || !domain) {
      return false;
    }
    if (/\s/.test(email)) {
      return false;
    }

    const labels = domain.split('.');
    return labels.length >= 2 && labels.every((label) => label.length > 0);
  }

  public asString(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
