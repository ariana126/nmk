import { Clock } from '@framework/domain';
import { Injectable } from '@nestjs/common';

/**
 * The instant the clock holds at startup and returns to on reset, so every test
 * run starts frozen at the same, deterministic point in time.
 */
export const DEFAULT_INSTANT = new Date('2026-01-01T00:00:00.000Z');

/**
 * A clock whose current instant can be set and advanced at runtime, used in the
 * test environment so scenarios can control time. It starts frozen at
 * {@link DEFAULT_INSTANT} and never moves on its own.
 */
@Injectable()
export class TunableClock extends Clock {
  private current = new Date(DEFAULT_INSTANT);

  now(): Date {
    return new Date(this.current);
  }

  set(instant: Date): void {
    this.current = new Date(instant);
  }

  advanceBy(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  reset(): void {
    this.current = new Date(DEFAULT_INSTANT);
  }
}
