import { notes, QuestionAdapter } from '@serenity-js/core';
import { SignUpPayload } from '../registration/sign-up-details';

/**
 * Each actor keeps their own notepad (see support/actors.ts), so these read back
 * whatever the *answering* actor noted down — no need to name them.
 */
export interface AccountNotes {
  /** What the actor actually submitted to sign up — invalid or incomplete payloads included. */
  details: SignUpPayload;
}

export const TheDetailsTheySignedUpWith = (): QuestionAdapter<SignUpPayload> =>
  notes<AccountNotes>().get('details');
