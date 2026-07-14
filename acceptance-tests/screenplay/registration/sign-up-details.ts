export interface SignUpDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export type SignUpField = keyof SignUpDetails;

/** A sign-up request is only a *partial* SignUpDetails: scenarios deliberately omit fields. */
export type SignUpPayload = Partial<SignUpDetails>;

export const requiredSignUpFields: SignUpField[] = [
  'email',
  'password',
  'firstName',
  'lastName',
];

/**
 * The feature file names people, not credentials, so each actor's details are derived
 * from their name. Every value here is one the backend accepts, which also means one
 * actor can work out another's email without having to be told it.
 */
export const signUpDetailsOf = (actorName: string): SignUpDetails => ({
  email: `${actorName.toLowerCase()}@example.com`,
  // Per-actor, so that logging in with someone else's email and *this* actor's password
  // is genuinely the wrong password rather than an accidental match.
  password: `Str0ng-${actorName}-Passphrase!2026`,
  firstName: actorName,
  lastName: 'Doe',
});

export const signUpDetailsWithout = (
  actorName: string,
  field: SignUpField,
): SignUpPayload => {
  const details: SignUpPayload = signUpDetailsOf(actorName);
  delete details[field];
  return details;
};
