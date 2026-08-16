import { Given, Then, When } from '@cucumber/cucumber';
import { Actor, actorInTheSpotlight } from '@serenity-js/core';
import { EnsureValidationErrorFor } from '../../screenplay/common/problem-detail';
import {
  EnsureRejectedAsDuplicateEmail,
  EnsureSignedUp,
  SignUp,
  TheOmittedSignUpField,
} from '../../screenplay/registration/sign-up';
import {
  SignUpField,
  signUpDetailsOf,
  signUpDetailsWithout,
} from '../../screenplay/registration/sign-up-details';
import {
  EnsureCredentialsRejected,
  EnsureLoggedIn,
  EnsureNotLoggedIn,
  LogIn,
  LogOut,
  TheirOwnCredentials,
} from '../../screenplay/authentication/log-in';
import {
  EnsureProfileMatchesSignUpDetails,
  ViewTheirProfile,
} from '../../screenplay/profile/view-profile';

Given("{actor} doesn't have an account", function (_actor: Actor) {
  // Nothing to do: every scenario runs against a truncated database (support/hooks.ts).
  // Naming the actor is what puts them in the spotlight for the "he" steps that follow.
});

// Passive voice — we care only *that* the account exists, so take the API shortcut.
Given('{actor} already has an account', function (actor: Actor) {
  return actor.attemptsTo(
    SignUp.viaApiUsing(signUpDetailsOf(actor.name)),
    EnsureSignedUp(),
  );
});

// Active voice, and the one journey this suite demonstrates end to end — through the browser.
When('{pronoun} signs up', function (actor: Actor) {
  return actor.attemptsTo(SignUp.using(signUpDetailsOf(actor.name)));
});

When(
  '{pronoun} signs up with the password {string}',
  function (actor: Actor, password: string) {
    return actor.attemptsTo(
      SignUp.viaApiUsing({ ...signUpDetailsOf(actor.name), password }),
    );
  },
);

When(
  '{pronoun} signs up with the email {string}',
  function (actor: Actor, email: string) {
    return actor.attemptsTo(
      SignUp.viaApiUsing({ ...signUpDetailsOf(actor.name), email }),
    );
  },
);

When(
  '{pronoun} signs up without providing his {field}',
  function (actor: Actor, field: SignUpField) {
    return actor.attemptsTo(
      SignUp.viaApiUsing(signUpDetailsWithout(actor.name, field)),
    );
  },
);

When(
  "{actor} signs up with {actorName}'s email",
  function (actor: Actor, otherActorName: string) {
    return actor.attemptsTo(
      SignUp.using({
        ...signUpDetailsOf(actor.name),
        email: signUpDetailsOf(otherActorName).email,
      }),
    );
  },
);

Then('the sign-up should be rejected due to a duplicate email', function () {
  return actorInTheSpotlight().attemptsTo(EnsureRejectedAsDuplicateEmail());
});

Then('the sign-up should be rejected due to a weak password', function () {
  return actorInTheSpotlight().attemptsTo(EnsureValidationErrorFor('password'));
});

Then('the sign-up should be rejected due to an invalid email', function () {
  return actorInTheSpotlight().attemptsTo(EnsureValidationErrorFor('email'));
});

Then(
  'the sign-up should be rejected due to missing required data',
  function () {
    return actorInTheSpotlight().attemptsTo(
      EnsureValidationErrorFor(TheOmittedSignUpField()),
    );
  },
);

/**
 * Logging out first is load-bearing, not tidiness: the sign-up form logs the visitor straight in
 * and lands them on their profile, so without it this step would confirm a session that already
 * existed and pass whether logging in works or not.
 */
Then('{pronoun} should be able to login', function (actor: Actor) {
  return actor.attemptsTo(
    LogOut(),
    LogIn.using(TheirOwnCredentials()),
    EnsureLoggedIn(),
  );
});

// The actors reaching this step never opened a browser — their sign-up was rejected at the API.
Then('{pronoun} should not be able to login', function (actor: Actor) {
  return actor.attemptsTo(
    LogIn.viaApiUsing(TheirOwnCredentials()),
    EnsureNotLoggedIn(),
  );
});

Then(
  "{actor} should not be able to login with {actorName}'s email",
  function (actor: Actor, otherActorName: string) {
    return actor.attemptsTo(
      LogIn.using({
        email: signUpDetailsOf(otherActorName).email,
        password: signUpDetailsOf(actor.name).password,
      }),
      EnsureCredentialsRejected(),
    );
  },
);

Then('sees his profile', function () {
  return actorInTheSpotlight().attemptsTo(
    ViewTheirProfile.viaTheSiteHeader(),
    EnsureProfileMatchesSignUpDetails(),
  );
});
