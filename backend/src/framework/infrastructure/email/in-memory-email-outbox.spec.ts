import { EmailMessage } from '@framework/application';
import { Clock, Email } from '@framework/domain';

import { InMemoryEmailOutbox } from './in-memory-email-outbox';

const ADA = Email.fromString('ada@example.com');
const GRACE = Email.fromString('grace@example.com');

const NINE = new Date('2026-01-01T09:00:00.000Z');
const TEN = new Date('2026-01-01T10:00:00.000Z');

class TickingClock extends Clock {
  private index = 0;

  constructor(private readonly instants: Date[]) {
    super();
  }

  now(): Date {
    const instant =
      this.instants[Math.min(this.index, this.instants.length - 1)];
    this.index += 1;
    return new Date(instant);
  }
}

function aMessage(recipient: Email, subject = 'Hello'): EmailMessage {
  return new EmailMessage(recipient, subject, 'the body');
}

describe('InMemoryEmailOutbox', () => {
  it('an address that was never written to has nothing waiting', () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE]));

    expect(sut.sentTo(ADA)).toEqual([]);
  });

  it('a message is stamped with the moment it was handed over', async () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE]));

    await sut.send(aMessage(ADA, 'Reset your password'));

    expect(sut.sentTo(ADA)).toEqual([
      {
        recipient: ADA,
        subject: 'Reset your password',
        body: 'the body',
        sentAt: NINE,
      },
    ]);
  });

  it('the most recent message to an address comes back first', async () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE, TEN]));
    await sut.send(aMessage(ADA, 'the older one'));
    await sut.send(aMessage(ADA, 'the newer one'));

    const sent = sut.sentTo(ADA);

    expect(sent.map((message) => message.subject)).toEqual([
      'the newer one',
      'the older one',
    ]);
  });

  it('messages to one address are not visible to another', async () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE, TEN]));
    await sut.send(aMessage(ADA, 'for Ada'));
    await sut.send(aMessage(GRACE, 'for Grace'));

    expect(sut.sentTo(GRACE).map((message) => message.subject)).toEqual([
      'for Grace',
    ]);
  });

  it('reading the outbox does not consume it', async () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE]));
    await sut.send(aMessage(ADA));

    sut.sentTo(ADA);

    expect(sut.sentTo(ADA)).toHaveLength(1);
  });

  it('clearing the outbox leaves nothing behind for any address', async () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE, TEN]));
    await sut.send(aMessage(ADA));
    await sut.send(aMessage(GRACE));

    sut.clear();

    expect(sut.sentTo(ADA)).toEqual([]);
    expect(sut.sentTo(GRACE)).toEqual([]);
  });

  it('a cleared outbox still accepts new messages', async () => {
    const sut = new InMemoryEmailOutbox(new TickingClock([NINE, TEN]));
    await sut.send(aMessage(ADA, 'before the clear'));
    sut.clear();

    await sut.send(aMessage(ADA, 'after the clear'));

    expect(sut.sentTo(ADA).map((message) => message.subject)).toEqual([
      'after the clear',
    ]);
  });
});
