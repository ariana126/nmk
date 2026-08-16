import { EmailMessage, EmailSender } from '@framework/application';
import { Email } from '@framework/domain';
import { PasswordResetNotifier } from '@identity/domain/service/password-reset-notifier';
import { Injectable } from '@nestjs/common';

const SUBJECT = 'Reset your password';

/**
 * Composes the reset link and hands the message to whichever {@link EmailSender}
 * is bound.
 *
 * The link's shape — `<base>/reset-password?token=<secret>` — is a contract with
 * whatever reads the email, so it is spelled out here rather than assembled
 * anywhere else. The base URL arrives as a plain constructor value, which keeps
 * this adapter free of `ConfigService`; the module reads the environment once
 * and passes it in.
 */
@Injectable()
export class EmailPasswordResetNotifier extends PasswordResetNotifier {
  private readonly appBaseUrl: string;

  constructor(
    private readonly emailSender: EmailSender,
    appBaseUrl: string,
  ) {
    super();
    this.appBaseUrl = appBaseUrl.replace(/\/$/, '');
  }

  async notify(recipient: Email, secret: string): Promise<void> {
    await this.emailSender.send(
      new EmailMessage(recipient, SUBJECT, this.bodyFor(secret)),
    );
  }

  private bodyFor(secret: string): string {
    return [
      'We received a request to reset the password for this account.',
      '',
      'Choose a new password here:',
      this.linkFor(secret),
      '',
      'The link works once and stops working an hour after it was requested.',
      'If you did not ask for this, nothing has changed and you can ignore this email.',
    ].join('\n');
  }

  private linkFor(secret: string): string {
    return `${this.appBaseUrl}/reset-password?token=${encodeURIComponent(secret)}`;
  }
}
