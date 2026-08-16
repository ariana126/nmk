import { signUpDetailsOf } from '../registration/sign-up-details';

/**
 * What an actor types into the login form, and the whole of what the login endpoint accepts: the
 * DTO runs under a whitelisting pipe, so the firstName/lastName an actor signed up with must not
 * be sent along. Both fields are optional because the "Missing credentials" outline deliberately
 * leaves one out.
 */
export interface Credentials {
  email?: string;
  password?: string;
}

export type CredentialField = keyof Credentials;

export const requiredCredentialFields: CredentialField[] = [
  'email',
  'password',
];

/**
 * Derived from the actor's name, exactly as `signUpDetailsOf` derives everything else from it —
 * which is what lets an actor who never signed up in this scenario still know what she would type.
 * "Unknown email" is that case: the Background registers only Ariana, so Fateme has nothing in her
 * notepad to read back and her credentials can only come from her name.
 */
export const theCredentialsOf = (actorName: string): Credentials => {
  const { email, password } = signUpDetailsOf(actorName);
  return { email, password };
};

export const theCredentialsWithout = (
  actorName: string,
  field: CredentialField,
): Credentials => {
  const credentials = theCredentialsOf(actorName);
  delete credentials[field];
  return credentials;
};

/**
 * A password that is not the actor's own — what "logs in with the wrong password" needs.
 *
 * Per-actor for the same reason `signUpDetailsOf`'s password is: a value shared between actors
 * could accidentally *be* somebody's real password, and the scenario asserting that the login is
 * refused would then pass for the wrong reason. Derived from the name, so it is wrong for this
 * actor and for every other one.
 */
export const theWrongPasswordOf = (actorName: string): string =>
  `Wr0ng-${actorName}-Passphrase!2026`;
