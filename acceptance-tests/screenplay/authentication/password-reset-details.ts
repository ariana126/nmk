/**
 * The passwords an actor picks when resetting, derived from their name for exactly the reason
 * `signUpDetailsOf` derives everything else from it: the feature file names people rather than
 * credentials, and a per-actor value keeps "log in with *his* new password" from accidentally
 * matching somebody else's.
 *
 * Two of them, because "Reset link used twice" needs the password of the reset that worked to stay
 * distinguishable from the one the second attempt tried to set.
 */
export const theNewPasswordOf = (actorName: string): string =>
  `N3w-${actorName}-Passphrase!2026`;

export const anotherPasswordOf = (actorName: string): string =>
  `An0ther-${actorName}-Passphrase!2026`;
