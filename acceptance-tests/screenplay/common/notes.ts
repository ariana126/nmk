import { notes, QuestionAdapter } from '@serenity-js/core';
import { Credentials } from '../authentication/login-credentials';
import { SignUpPayload } from '../registration/sign-up-details';

/**
 * Each actor keeps their own notepad (see support/actors.ts), so these read back
 * whatever the *answering* actor noted down — no need to name them.
 */
export interface AccountNotes {
  /** What the actor actually submitted to sign up — invalid or incomplete payloads included. */
  details: SignUpPayload;

  /**
   * What the actor last submitted to log in — incomplete credentials included, which is what lets
   * the "Missing credentials" outline work out afterwards which one it left out. The sign-up
   * details above cannot answer that: they are always complete.
   */
  credentials: Credentials;

  /**
   * The password reset link the actor was emailed, as read out of their inbox.
   * Noted rather than re-read on demand, so a later step can follow the link without
   * the inbox's response having to still be the last one.
   */
  resetLink: string;
}

export const TheDetailsTheySignedUpWith = (): QuestionAdapter<SignUpPayload> =>
  notes<AccountNotes>().get('details');

export const TheCredentialsTheyLoggedInWith =
  (): QuestionAdapter<Credentials> => notes<AccountNotes>().get('credentials');
