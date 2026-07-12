import { Entity } from './entity';
import { DomainEvent } from './domain-event';

export abstract class AggregateRoot extends Entity {
  private events: DomainEvent[] = [];

  public releaseEvents(): DomainEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  protected recordThat(event: DomainEvent): void {
    this.events.push(event);
  }
}
