import { notes, QuestionAdapter } from '@serenity-js/core';
import { SignUpPayload } from '../registration/sign-up-details';

/**
 * Each actor keeps their own notepad (see support/actors.ts), so these read back
 * whatever the *answering* actor noted down — no need to name them.
 */
export interface AccountNotes {
  /** What the actor actually submitted to sign up — invalid or incomplete payloads included. */
  details: SignUpPayload;

  /**
   * The password reset link the actor was emailed, as read out of their inbox.
   * Noted rather than re-read on demand, so a later step can follow the link without
   * the inbox's response having to still be the last one.
   */
  resetLink: string;
}

export const TheDetailsTheySignedUpWith = (): QuestionAdapter<SignUpPayload> =>
  notes<AccountNotes>().get('details');
