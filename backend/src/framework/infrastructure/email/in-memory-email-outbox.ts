import { EmailMessage, EmailSender } from '@framework/application';
import { Clock, Email } from '@framework/domain';
import { Injectable } from '@nestjs/common';

/** A message the outbox accepted, stamped with the moment it was handed over. */
export class SentEmail {
  constructor(
    public readonly recipient: Email,
    public readonly subject: string,
    public readonly body: string,
    public readonly sentAt: Date,
  ) {}
}

/**
 * The only {@link EmailSender} the application currently binds: it keeps every
 * message in memory instead of delivering it. No provider has been chosen yet,
 * and this keeps that decision out of the code — swapping in a real one is a
 * single binding change in {@link EmailModule}, with nothing else to touch.
 *
 * Being in-memory, the outbox is per-process and lost on restart. That is fine
 * for a placeholder, and it is what lets the app boot in every environment.
 */
@Injectable()
export class InMemoryEmailOutbox extends EmailSender {
  private readonly messages: SentEmail[] = [];

  constructor(private readonly clock: Clock) {
    super();
  }

  send(message: EmailMessage): Promise<void> {
    this.messages.push(
      new SentEmail(
        message.recipient,
        message.subject,
        message.body,
        this.clock.now(),
      ),
    );
    return Promise.resolve();
  }

  /** Everything sent to an address, most recently sent first. */
  sentTo(recipient: Email): SentEmail[] {
    return this.messages
      .filter((message) => message.recipient.equals(recipient))
      .toReversed();
  }

  /**
   * Throws away everything sent so far. Sent mail is state like any other, so the
   * testing endpoint that hands a test runner a clean slate clears this too.
   */
  clear(): void {
    this.messages.length = 0;
  }
}
