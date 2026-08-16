import { Given, Then, When } from '@cucumber/cucumber';
import { Actor, actorInTheSpotlight, Duration } from '@serenity-js/core';
import { LetTimePass } from '../../screenplay/common/clock';
import { EnsureValidationErrorFor } from '../../screenplay/common/problem-detail';
import {
  EnsurePasswordReset,
  EnsurePasswordResetRequested,
  EnsureRejectedAsUnknownEmail,
  EnsureResetLinkAlreadyUsed,
  EnsureResetLinkExpired,
  RequestAPasswordReset,
  ResetTheirPassword,
} from '../../screenplay/authentication/forgot-password';
import {
  EnsureAccessGranted,
  EnsureLoggedIn,
  EnsureNotLoggedIn,
  LogIn,
  TheirCredentialsWith,
  TheirOwnCredentials,
} from '../../screenplay/authentication/log-in';
import {
  anotherPasswordOf,
  theNewPasswordOf,
} from '../../screenplay/authentication/password-reset-details';
import { signUpDetailsOf } from '../../screenplay/registration/sign-up-details';

/**
 * `Given Ariana already has an account` is the Background of every scenario here and belongs to
 * `../registration/sign-up.steps.ts`. Defining it a second time would be ambiguous, which fails
 * whatever `strict` says.
 */

// Active voice, and the second journey this suite demonstrates end to end — through the browser.
When('{pronoun} requests a password reset', function (actor: Actor) {
  return actor.attemptsTo(
    RequestAPasswordReset.using(signUpDetailsOf(actor.name).email),
  );
});

/**
 * `{actor}` rather than `{pronoun}`, because the feature file names somebody who is not the actor
 * in the spotlight — and naming her is what puts *her* last response in front of the `Then`.
 */
When('{actor} requests a password reset', function (actor: Actor) {
  return actor.attemptsTo(
    RequestAPasswordReset.viaApiUsing(signUpDetailsOf(actor.name).email),
  );
});

// Past tense: we care only *that* it happened, so it takes the API.
Given('{actor} requested a password reset', function (actor: Actor) {
  return actor.attemptsTo(
    RequestAPasswordReset.viaApiUsing(signUpDetailsOf(actor.name).email),
    EnsurePasswordResetRequested(),
  );
});

Given('{actor} already reset his password', function (actor: Actor) {
  return actor.attemptsTo(
    RequestAPasswordReset.viaApiUsing(signUpDetailsOf(actor.name).email),
    EnsurePasswordResetRequested(),
    ResetTheirPassword.viaApiUsing(theNewPasswordOf(actor.name)),
    EnsurePasswordReset(),
  );
});

When(
  '{pronoun} sets a new password using the reset link he was sent',
  function (actor: Actor) {
    return actor.attemptsTo(
      ResetTheirPassword.using(theNewPasswordOf(actor.name)),
    );
  },
);

/**
 * The reset link lives for an hour, so two hours is comfortably past it. Time moves through the
 * backend's tunable clock — the same clock `support/hooks.ts` resets before every scenario — which
 * is what makes an expiry testable without waiting for one.
 */
When('{pronoun} sets a new password two hours later', function (actor: Actor) {
  return actor.attemptsTo(
    LetTimePass(Duration.ofHours(2).inMilliseconds()),
    ResetTheirPassword.viaApiUsing(theNewPasswordOf(actor.name)),
  );
});

When(
  '{pronoun} sets another password using the same reset link',
  function (actor: Actor) {
    return actor.attemptsTo(
      ResetTheirPassword.viaApiUsing(anotherPasswordOf(actor.name)),
    );
  },
);

When(
  '{pronoun} sets the new password {string} using the reset link he was sent',
  function (actor: Actor, password: string) {
    return actor.attemptsTo(ResetTheirPassword.viaApiUsing(password));
  },
);

Then(
  'the password reset request should be rejected due to an unknown email',
  function () {
    return actorInTheSpotlight().attemptsTo(EnsureRejectedAsUnknownEmail());
  },
);

Then(
  'the password reset should be rejected due to an expired link',
  function () {
    return actorInTheSpotlight().attemptsTo(EnsureResetLinkExpired());
  },
);

Then(
  'the password reset should be rejected due to an already used link',
  function () {
    return actorInTheSpotlight().attemptsTo(EnsureResetLinkAlreadyUsed());
  },
);

// The same `400 validation-error` the sign-up outlines get: only the field tells them apart.
Then(
  'the password reset should be rejected due to a weak password',
  function () {
    return actorInTheSpotlight().attemptsTo(
      EnsureValidationErrorFor('password'),
    );
  },
);

/**
 * Through the browser, closing the journey the way it opened: a reset is only worth anything if
 * the visitor can get back in with what they chose. No logging out first — unlike sign-up, a
 * successful reset deliberately leaves the visitor without a session.
 */
Then(
  '{pronoun} should be able to login with his new password',
  function (actor: Actor) {
    return actor.attemptsTo(
      LogIn.using(TheirCredentialsWith(theNewPasswordOf(actor.name))),
      EnsureLoggedIn(),
    );
  },
);

Then(
  '{pronoun} should not be able to login with his old password',
  function (actor: Actor) {
    return actor.attemptsTo(
      LogIn.viaApiUsing(TheirOwnCredentials()),
      EnsureNotLoggedIn(),
    );
  },
);

// "Still": the rejected reset changed nothing, so what they signed up with keeps working.
Then(
  '{pronoun} should still be able to login with his old password',
  function (actor: Actor) {
    return actor.attemptsTo(
      LogIn.viaApiUsing(TheirOwnCredentials()),
      EnsureAccessGranted(),
    );
  },
);

Then(
  '{pronoun} should still be able to login with his new password',
  function (actor: Actor) {
    return actor.attemptsTo(
      LogIn.viaApiUsing(TheirCredentialsWith(theNewPasswordOf(actor.name))),
      EnsureAccessGranted(),
    );
  },
);
