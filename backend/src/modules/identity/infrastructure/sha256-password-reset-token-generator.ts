import { createHash, randomBytes } from 'node:crypto';

import { PasswordResetTokenGenerator } from '@identity/domain/service/password-reset-token-generator';
import { PasswordResetToken } from '@identity/domain/value/password-reset-token.vo';
import { Injectable } from '@nestjs/common';

/** 256 bits of entropy, which is what makes a plain digest safe here. */
const SECRET_BYTES = 32;

/**
 * Mints reset secrets and digests them with SHA-256.
 *
 * A single unsalted hash would be wrong for a password, because a password is
 * low-entropy and guessable. A secret drawn from 256 random bits is neither, so
 * the digest only has to be deterministic and one-way: deterministic so the
 * presented secret can be looked up, one-way so a leaked database yields no
 * usable links. Base64url keeps the secret safe to carry in a URL untouched.
 */
@Injectable()
export class Sha256PasswordResetTokenGenerator extends PasswordResetTokenGenerator {
  generateSecret(): string {
    return randomBytes(SECRET_BYTES).toString('base64url');
  }

  digest(secret: string): PasswordResetToken {
    return PasswordResetToken.fromDigest(
      createHash('sha256').update(secret, 'utf8').digest('hex'),
    );
  }
}
