import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';

/**
 * Mints the secret that goes out by email and turns any secret into the token
 * that is stored and looked up. `digest` must be deterministic: redeeming a
 * link works by digesting the presented secret and finding the user that holds
 * the matching token.
 */
export abstract class PasswordResetTokenGenerator {
  abstract generateSecret(): string;
  abstract digest(secret: string): PasswordResetToken;
}
