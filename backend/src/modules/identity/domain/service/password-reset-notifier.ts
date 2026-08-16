import { Email } from '@framework/domain';

/**
 * Tells a user how to reset their password. The recipient receives the secret;
 * only its digest is ever stored, so this port is the one place the secret
 * leaves the application.
 */
export abstract class PasswordResetNotifier {
  abstract notify(recipient: Email, secret: string): Promise<void>;
}
