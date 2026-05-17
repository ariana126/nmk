import { Identity } from './value/identity.vo';

export abstract class Entity {
  constructor(public readonly id: Identity) {}

  public equals(other: Entity): boolean {
    return this.id.equals(other.id);
  }
}
