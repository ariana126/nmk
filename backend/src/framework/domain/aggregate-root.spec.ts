import { Identity } from './value/identity.vo';
import { AggregateRoot } from './aggregate-root';
import { DomainEvent } from './domain-event';

class TestEvent implements DomainEvent {}
class AnotherEvent implements DomainEvent {}

class TestAggregate extends AggregateRoot {
  record(event: DomainEvent): void {
    this.recordThat(event);
  }
}

describe('AggregateRoot', () => {
  it('has no events before any are recorded', () => {
    const sut = new TestAggregate(Identity.new());
    expect(sut.releaseEvents()).toEqual([]);
  });

  it('returns all recorded events in the order they were raised', () => {
    // Arrange
    const sut = new TestAggregate(Identity.new());
    const e1 = new TestEvent();
    const e2 = new AnotherEvent();
    sut.record(e1);
    sut.record(e2);
    // Act / Assert
    expect(sut.releaseEvents()).toEqual([e1, e2]);
  });

  it('events are cleared after being released', () => {
    // Arrange
    const sut = new TestAggregate(Identity.new());
    sut.record(new TestEvent());
    // Act
    sut.releaseEvents();
    // Assert
    expect(sut.releaseEvents()).toEqual([]);
  });
});
