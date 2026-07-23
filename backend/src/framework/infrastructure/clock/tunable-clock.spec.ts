import { DEFAULT_INSTANT, TunableClock } from './tunable-clock';

describe('TunableClock', () => {
  it('starts frozen at the default instant', () => {
    const sut = new TunableClock();
    expect(sut.now()).toEqual(DEFAULT_INSTANT);
  });

  it('does not move on its own', () => {
    const sut = new TunableClock();
    expect(sut.now()).toEqual(sut.now());
  });

  it('set freezes at the given instant', () => {
    const sut = new TunableClock();
    const instant = new Date('2030-06-15T12:00:00.000Z');

    sut.set(instant);

    expect(sut.now()).toEqual(instant);
  });

  it('advanceBy moves the current instant forward', () => {
    const sut = new TunableClock();
    sut.set(new Date('2030-01-01T00:00:00.000Z'));

    sut.advanceBy(90 * 60 * 1000);

    expect(sut.now()).toEqual(new Date('2030-01-01T01:30:00.000Z'));
  });

  it('reset returns to the default instant', () => {
    const sut = new TunableClock();
    sut.set(new Date('2030-01-01T00:00:00.000Z'));

    sut.reset();

    expect(sut.now()).toEqual(DEFAULT_INSTANT);
  });

  it('now returns a copy that cannot mutate internal state', () => {
    const sut = new TunableClock();
    const first = sut.now();

    first.setFullYear(1999);

    expect(sut.now()).toEqual(DEFAULT_INSTANT);
  });

  it('set stores a copy, so mutating the argument does not move the clock', () => {
    const sut = new TunableClock();
    const instant = new Date('2030-06-15T12:00:00.000Z');

    sut.set(instant);
    instant.setFullYear(1999);

    expect(sut.now()).toEqual(new Date('2030-06-15T12:00:00.000Z'));
  });

  it('does not mutate the shared default instant across resets', () => {
    const sut = new TunableClock();
    sut.advanceBy(1000);
    sut.reset();

    expect(DEFAULT_INSTANT).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });
});
