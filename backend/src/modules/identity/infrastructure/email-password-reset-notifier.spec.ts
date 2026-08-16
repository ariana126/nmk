import { EmailMessage, EmailSender } from '@framework/application';
import { Email } from '@framework/domain';

import { EmailPasswordResetNotifier } from './email-password-reset-notifier';

const APP_BASE_URL = 'http://localhost:4200';
const ADA = Email.fromString('ada@example.com');
const SECRET = 'the-secret-in-the-link';

class CapturingEmailSender extends EmailSender {
  public readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

function createNotifier(appBaseUrl = APP_BASE_URL) {
  const emailSender = new CapturingEmailSender();
  return {
    sut: new EmailPasswordResetNotifier(emailSender, appBaseUrl),
    emailSender,
  };
}

describe('EmailPasswordResetNotifier', () => {
  it('the message goes to the address that asked for the reset', async () => {
    const { sut, emailSender } = createNotifier();

    await sut.notify(ADA, SECRET);

    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0].recipient).toEqual(ADA);
    expect(emailSender.sent[0].subject).toBe('Reset your password');
  });

  it('the body carries the link the recipient is meant to follow', async () => {
    const { sut, emailSender } = createNotifier();

    await sut.notify(ADA, SECRET);

    expect(emailSender.sent[0].body).toContain(
      'http://localhost:4200/reset-password?token=the-secret-in-the-link',
    );
  });

  it('a base URL with a trailing slash does not double it', async () => {
    const { sut, emailSender } = createNotifier('http://localhost:4200/');

    await sut.notify(ADA, SECRET);

    expect(emailSender.sent[0].body).toContain(
      'http://localhost:4200/reset-password?token=',
    );
    expect(emailSender.sent[0].body).not.toContain('4200//reset-password');
  });

  it('a secret with URL-significant characters is escaped in the link', async () => {
    const { sut, emailSender } = createNotifier();

    await sut.notify(ADA, 'a secret&with=trouble');

    expect(emailSender.sent[0].body).toContain(
      '/reset-password?token=a%20secret%26with%3Dtrouble',
    );
  });
});
