import { Then, When } from '@cucumber/cucumber';
import { Actor, actorInTheSpotlight, Duration } from '@serenity-js/core';
import { LetTimePass } from '../../screenplay/common/clock';
import { EnsureValidationErrorFor } from '../../screenplay/common/problem-detail';
import {
  EnsureAskedToLogIn,
  EnsureCredentialsRejected,
  EnsureLoggedIn,
  EnsureNoLongerRecognised,
  LogIn,
  LogOut,
  TheirCredentialsWith,
  TheirOwnCredentials,
  TheOmittedCredential,
} from '../../screenplay/authentication/log-in';
import {
  CredentialField,
  theCredentialsOf,
  theCredentialsWithout,
  theWrongPasswordOf,
} from '../../screenplay/authentication/login-credentials';
import { ViewTheirProfile } from '../../screenplay/profile/view-profile';

/**
 * `Given Ariana already has an account` is the Background of every scenario here and belongs to
 * `../registration/sign-up.steps.ts`. Defining it a second time would be ambiguous, which fails
 * whatever `strict` says.
 *
 * Every browser step below takes `LogIn.viaDirectNavigation` rather than `LogIn.using`: that
 * Background is API-only, so nothing here has a page open for `LocateTheLoginForm.viaTheSiteHeader`
 * to find a "Log in" link on, and clicking one on `about:blank` fails with a
 * `ListItemNotFoundError`. Arriving at the login page directly is just as real a route in.
 */

// Active voice: logging in is the journey this feature exists to demonstrate, so it drives the
// browser — and unlike the sign-up file's `should be able to login`, here it is the subject.
When('{pronoun} logs in', function (actor: Actor) {
  return actor.attemptsTo(LogIn.viaDirectNavigation(TheirOwnCredentials()));
});

/**
 * `{actor}` rather than `{pronoun}`, because the feature file names somebody who is not the actor
 * in the spotlight — and naming her is what puts *her* rejection in front of the following `Then`.
 * Fateme has no account: the Background registers only Ariana. That is also why her credentials
 * come from her name rather than from her notepad, which is empty — `TheirOwnCredentials()` reads
 * what an actor signed up with, and she never did.
 */
When('{actor} logs in', function (actor: Actor) {
  return actor.attemptsTo(
    LogIn.viaDirectNavigation(theCredentialsOf(actor.name)),
  );
});

// Her own email, a password that is nobody's — see `theWrongPasswordOf` for why it is per-actor.
When('{pronoun} logs in with the wrong password', function (actor: Actor) {
  return actor.attemptsTo(
    LogIn.viaDirectNavigation(
      TheirCredentialsWith(theWrongPasswordOf(actor.name)),
    ),
  );
});

/**
 * `{field}` yields any of the four sign-up fields, but only `email` and `password` are credentials
 * and only those two appear in this outline — hence the narrower type.
 */
When(
  '{pronoun} logs in without providing his {field}',
  function (actor: Actor, field: CredentialField) {
    return actor.attemptsTo(
      LogIn.viaApiUsing(theCredentialsWithout(actor.name, field)),
    );
  },
);

When(
  '{pronoun} logs in with the email {string}',
  function (actor: Actor, email: string) {
    return actor.attemptsTo(
      LogIn.viaApiUsing({ ...theCredentialsOf(actor.name), email }),
    );
  },
);

When('{pronoun} logs out', function (actor: Actor) {
  return actor.attemptsTo(LogOut());
});

// No "Profile" link is offered to an anonymous visitor, so the only way to try is to ask for the
// page outright — which is exactly what the scenario describes.
When(
  '{pronoun} tries to reach his profile without logging in',
  function (actor: Actor) {
    return actor.attemptsTo(ViewTheirProfile.viaDirectNavigation());
  },
);

/**
 * The access token lives an hour, and the guard checks it against the backend's tunable clock — the
 * same one "Expired reset link" advances. `LetTimePass` is what makes an expiry testable without
 * waiting for one.
 *
 * *Returning* to the profile has to be a fresh navigation: the actor is already looking at that
 * page, and asking the router for a URL it is already on would re-render nothing, send no request,
 * and leave the expired token unused.
 */
When(
  '{pronoun} returns to his profile two hours later',
  function (actor: Actor) {
    return actor.attemptsTo(
      LetTimePass(Duration.ofHours(2).inMilliseconds()),
      ViewTheirProfile.viaDirectNavigation(),
    );
  },
);

Then('{pronoun} should be back in his account', function (actor: Actor) {
  return actor.attemptsTo(EnsureLoggedIn());
});

/**
 * Deliberately the same sentence as the "Unknown email" scenario's. The app refuses a wrong
 * password and an address nobody registered with one identical message, and says nothing about
 * which of the two was wrong — writing the assertion twice is what makes that rule legible in the
 * living documentation. Through the UI, so what is asserted is what the visitor is actually told.
 */
Then(
  'the login should be rejected due to an incorrect email or password',
  function () {
    return actorInTheSpotlight().attemptsTo(EnsureCredentialsRejected());
  },
);

// The same `400 validation-error` the sign-up outlines get: only the field tells them apart, and
// the actor works out which one by reading back the credentials they submitted.
Then('the login should be rejected due to missing required data', function () {
  return actorInTheSpotlight().attemptsTo(
    EnsureValidationErrorFor(TheOmittedCredential()),
  );
});

// A malformed address is refused as invalid data, not as bad credentials — `400`, not `401`.
Then('the login should be rejected due to an invalid email', function () {
  return actorInTheSpotlight().attemptsTo(EnsureValidationErrorFor('email'));
});

// What a visitor can see of a session ending: the header goes back to offering "Log in".
Then('the site should no longer recognise him', function () {
  return actorInTheSpotlight().attemptsTo(EnsureNoLongerRecognised());
});

/**
 * Shared by "Profile page is private" and "Expired session" — two different causes, one rule the
 * visitor experiences: the profile is not reachable without a live session, and asking for it lands
 * them on the login page. It makes no claim about where they go afterwards, because it cannot: the
 * frontend falls back to `/profile` when there is no return URL, and `/profile` is the only guarded
 * route, so a `returnUrl` assertion here would pass even if the feature were broken.
 */
Then('{pronoun} should be asked to log in first', function (actor: Actor) {
  return actor.attemptsTo(EnsureAskedToLogIn());
});
