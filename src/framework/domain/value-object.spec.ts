import { ValueObject } from './value-object';

class Price extends ValueObject {
  constructor(
    readonly amount: number,
    readonly currency: string,
  ) {
    super();
  }
}

class Weight extends ValueObject {
  constructor(readonly grams: number) {
    super();
  }
}

describe('ValueObject', () => {
  it('two objects of the same type with identical properties are equal', () => {
    const sut = new Price(10, 'USD');
    const other = new Price(10, 'USD');
    expect(sut.equals(other)).toBe(true);
  });

  it('two objects of the same type with a differing property are not equal', () => {
    const sut = new Price(10, 'USD');
    const other = new Price(20, 'USD');
    expect(sut.equals(other)).toBe(false);
  });

  it('objects of different subclasses are not equal even when their shapes match', () => {
    const sut = new Weight(10);
    const other = new Price(10, 'USD') as unknown as Weight;
    expect(sut.equals(other)).toBe(false);
  });

  it('an object is not equal to null', () => {
    const sut = new Price(10, 'USD');
    expect(sut.equals(null as unknown as Price)).toBe(false);
  });

  it('an object is not equal to undefined', () => {
    const sut = new Price(10, 'USD');
    expect(sut.equals(undefined as unknown as Price)).toBe(false);
  });
});
