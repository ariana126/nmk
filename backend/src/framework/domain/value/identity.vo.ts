import { randomUUID } from 'crypto';
import { ValueObject } from '../value-object';

export class Identity extends ValueObject {
  private constructor(private readonly value: string) {
    super();
  }

  static new(): Identity {
    return new Identity(randomUUID());
  }

  static fromString(id: string): Identity {
    if (!id.trim()) {
      throw new Error('Identity value must not be empty');
    }
    return new Identity(id);
  }

  public asString(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
