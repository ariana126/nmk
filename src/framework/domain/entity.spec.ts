import { Identity } from './value/identity.vo';
import { Entity } from './entity';

class TestEntity extends Entity {}

describe('Entity', () => {
  it('two entities sharing the same id are equal', () => {
    const sut = new TestEntity(Identity.fromString('abc-123'));
    const other = new TestEntity(Identity.fromString('abc-123'));
    expect(sut.equals(other)).toBe(true);
  });

  it('entities with different ids are not equal', () => {
    const sut = new TestEntity(Identity.new());
    const other = new TestEntity(Identity.new());
    expect(sut.equals(other)).toBe(false);
  });
});
