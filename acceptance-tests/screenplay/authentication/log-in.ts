import {
  Answerable,
  notes,
  Question,
  QuestionAdapter,
  Task,
  Wait,
} from '@serenity-js/core';
import {
  Ensure,
  equals,
  includes,
  isPresent,
  not,
} from '@serenity-js/assertions';
import { LastResponse, PostRequest, Send } from '@serenity-js/rest';
import {
  Click,
  Enter,
  isVisible,
  Navigate,
  Page,
  Text,
} from '@serenity-js/web';
import {
  AccountNotes,
  TheCredentialsTheyLoggedInWith,
  TheDetailsTheySignedUpWith,
} from '../common/notes';
import { Form } from '../ui/form';
import { SiteHeader } from '../ui/site-header';
import { Credentials, requiredCredentialFields } from './login-credentials';

interface AccessTokenBody {
  accessToken: string;
}

/**
 * Projected down to just the credentials: the login endpoint rejects unknown fields,
 * so the firstName/lastName the actor signed up with must not be sent along.
 */
export const TheirOwnCredentials = (): QuestionAdapter<Credentials> =>
  Question.about('their own credentials', async (actor) => {
    const details = await actor.answer(TheDetailsTheySignedUpWith());
    return { email: details.email, password: details.password };
  });

/**
 * The same credentials, with the password swapped for another — what "log in with his *new*
 * password" and "logs in with the wrong password" both need. The email still comes from the notes,
 * so this stays true to whatever the actor signed up with; only the secret they now believe in
 * changes.
 */
export const TheirCredentialsWith = (
  password: Answerable<string>,
): QuestionAdapter<Credentials> =>
  Question.about(
    'their credentials, with a different password',
    async (actor) => {
      const details = await actor.answer(TheDetailsTheySignedUpWith());
      return { email: details.email, password: await actor.answer(password) };
    },
  );

/**
 * The same two doors as {@link SignUp}, for the same reason — with the browser door reachable two
 * ways, since the login page is somewhere a visitor arrives at as well as somewhere they click
 * through to.
 *
 * - `using` clicks the header's "Log in" link on whatever page is already open, which is what a
 *   returning visitor browsing the site does.
 * - `viaDirectNavigation` opens `/login` cold. `login.feature`'s Background is API-only, so its
 *   scenarios have no page open to click a header link on and would fail with a
 *   `ListItemNotFoundError`; a bookmarked login page is just as real a route in.
 * - `viaApiUsing` posts the credentials. The validation outlines take this one, along with the
 *   steps where "and of course they still can't get in" is a consequence being confirmed rather
 *   than a behaviour being shown.
 *
 * The goal is the same in all three; only the method name carries the route, which is what lets a
 * step swap one for another without the feature file noticing.
 */
export class LogIn {
  static using = (credentials: Answerable<Credentials>): Task =>
    LogInByFillingInTheForm(LocateTheLoginForm.viaTheSiteHeader(), credentials);

  static viaDirectNavigation = (credentials: Answerable<Credentials>): Task =>
    LogInByFillingInTheForm(
      LocateTheLoginForm.viaDirectNavigation(),
      credentials,
    );

  static viaApiUsing = (credentials: Answerable<Credentials>): Task =>
    Task.where(
      '#actor logs in (via the API)',
      notes<AccountNotes>().set('credentials', credentials),
      Send.a(PostRequest.to('auth/login').with(credentials)),
    );
}

/**
 * Both browser routes differ only in how the form is reached, so they share everything after it —
 * and report the same way, since finding the page is not what the scenario is about.
 */
const LogInByFillingInTheForm = (
  locateTheForm: Task,
  credentials: Answerable<Credentials>,
): Task =>
  Task.where(
    '#actor logs in',
    notes<AccountNotes>().set('credentials', credentials),
    locateTheForm,
    // Only complete credentials ever reach a form; the partial ones belong to the API route.
    FillInTheLoginForm(
      Question.fromObject<Credentials>(credentials) as QuestionAdapter<
        Required<Credentials>
      >,
    ),
    SubmitTheLoginForm(),
  );

/**
 * Two ways to the same page, grouped under the goal with the route in the method name.
 *
 * The header route assumes a page is already open — it is what "Successful password reset" takes,
 * landing on the login page and clicking through from there. The direct route assumes nothing,
 * which is what a scenario whose first UI step is a login needs.
 */
class LocateTheLoginForm {
  static viaTheSiteHeader = (): Task =>
    Task.where(
      '#actor locates the login form via the site header',
      // See the note on LocateTheSignUpForm for why each click is preceded by a wait.
      Wait.until(SiteHeader.logInLink(), isVisible()),
      Click.on(SiteHeader.logInLink()),
      Wait.until(Form.inputFor('Email address'), isVisible()),
    );

  static viaDirectNavigation = (): Task =>
    Task.where(
      '#actor locates the login form via direct navigation',
      Navigate.to('/login'),
      Wait.until(Form.inputFor('Email address'), isVisible()),
    );
}

const FillInTheLoginForm = (
  credentials: QuestionAdapter<Required<Credentials>>,
): Task =>
  Task.where(
    '#actor fills in the login form',
    Enter.theValue(credentials.email).into(Form.inputFor('Email address')),
    Enter.theValue(credentials.password).into(Form.inputFor('Password')),
  );

/**
 * Submitting means clicking *and waiting for the answer* — a visitor doesn't walk away from a form
 * mid-request, and neither can this task. Every other browser login in the suite happens to be
 * followed by a step that waits (`EnsureLoggedIn`, `EnsureCredentialsRejected`, `LogOut`), which
 * hid the gap; "Expired session" is the one that follows a login with an *action*, and it caught
 * it. Landing on the profile takes around half a second, so without this the clock was advanced
 * and `/profile` re-requested while the login was still in flight — Playwright's navigation was
 * swallowed by the app's own, the original page went on to load the profile with a token that was
 * still valid when it asked, and the scenario failed for a reason that had nothing to do with
 * expiry. Worse, when the login request lost the race outright the visitor was never signed in and
 * the scenario would have *passed* without proving anything.
 */
const SubmitTheLoginForm = (): Task =>
  Task.where(
    '#actor submits the login form',
    Click.on(Form.buttonCalled('Log in')),
    Wait.until(TheSiteHasAnsweredTheLoginForm(), equals(true)),
  );

/**
 * The one thing that is true however the login turns out: the site has had its say. It either took
 * the visitor somewhere else, or kept them here and told them why.
 */
const TheSiteHasAnsweredTheLoginForm = (): QuestionAdapter<boolean> =>
  Question.about(
    'whether the site has answered the login form',
    async (actor) => {
      const pathname = await actor.answer(Page.current().url().pathname);
      if (pathname !== '/login') {
        return true;
      }
      return actor.answer(Form.errorSummary().isVisible());
    },
  );

export const LogOut = (): Task =>
  Task.where(
    '#actor logs out',
    Wait.until(SiteHeader.logOutButton(), isVisible()),
    Click.on(SiteHeader.logOutButton()),
  );

/**
 * The "Missing credentials" outline doesn't name the field in its Then step, so recover it by
 * comparing what the actor submitted against what the endpoint requires — the same trick, and for
 * the same reason, as {@link TheOmittedSignUpField}.
 */
export const TheOmittedCredential = (): QuestionAdapter<string> =>
  Question.about('the credential they omitted', async (actor) => {
    const credentials = await actor.answer(TheCredentialsTheyLoggedInWith());
    return requiredCredentialFields.filter(
      (field) => credentials[field] === undefined,
    )[0];
  });

/**
 * Landing on the profile page is the outcome; the header offering "Log out" is what proves a
 * session exists rather than a page merely having rendered. The URL is checked first because
 * navigation is the later of the two events — the header flips as soon as the token is stored.
 */
export const EnsureLoggedIn = (): Task =>
  Task.where(
    '#actor ensures they are logged in',
    Wait.until(Page.current().url().pathname, equals('/profile')),
    Ensure.that(SiteHeader.logOutButton(), isVisible()),
  );

/**
 * No token was issued — which is what "should not be able to login" actually means, whatever the
 * status. Deliberately loose about which status, because its two callers reach it differently: a
 * rejected sign-up leaves the actor holding a payload that may itself be malformed, so logging in
 * with it fails validation (400) when the email was the invalid or missing part and authentication
 * (401) otherwise, while a password that has since been reset away is simply wrong (401).
 *
 * API-side only: it reads `LastResponse`, so it has nothing to say about a browser. What a visitor
 * can see of the same fact is {@link EnsureNoLongerRecognised}.
 */
export const EnsureNotLoggedIn = (): Task =>
  Task.where(
    '#actor ensures they are not logged in',
    Ensure.that(LastResponse.status(), not(equals(200))),
    Ensure.that(
      LastResponse.body<Partial<AccessTokenBody>>().accessToken,
      not(isPresent()),
    ),
  );

/**
 * The API-side counterpart of {@link EnsureLoggedIn}, and the mirror image of
 * {@link EnsureNotLoggedIn}: a token was issued, which is what "can still log in" means when
 * nobody is looking at a screen. Steps confirming that a *rejected* password reset left the old
 * credentials working take this route — the login is a consequence being checked, not a journey
 * being demonstrated.
 */
export const EnsureAccessGranted = (): Task =>
  Task.where(
    '#actor ensures they were granted access',
    Ensure.that(LastResponse.status(), equals(200)),
    Ensure.that(LastResponse.body<AccessTokenBody>().accessToken, isPresent()),
  );

/**
 * The banner, not a field: the app deliberately declines to say *which* of the two was wrong, so
 * there is nothing to attach to the email input. Asserting that we stayed on `/login` is what
 * distinguishes "rejected" from "the message flashed and we went in anyway".
 */
export const EnsureCredentialsRejected = (): Task =>
  Task.where(
    '#actor ensures their credentials were rejected',
    Wait.until(Form.errorSummary(), isVisible()),
    Ensure.that(
      Text.of(Form.errorSummary()),
      includes('Email or password is incorrect'),
    ),
    Ensure.that(Page.current().url().pathname, equals('/login')),
  );

/**
 * What a visitor can see of a session ending: the header goes back to offering "Log in", and the
 * "Log out" button it offered a moment ago is gone. Nothing here reaches behind the page for a
 * token — that is not something a visitor can observe.
 *
 * `not(isVisible())` rather than an absence check on purpose: `isVisible()` is
 * `and(isPresent(), …)` and short-circuits, so it answers `false` for an element that isn't in the
 * DOM at all instead of erroring.
 */
export const EnsureNoLongerRecognised = (): Task =>
  Task.where(
    '#actor ensures the site no longer recognises them',
    Wait.until(SiteHeader.logInLink(), isVisible()),
    Ensure.that(SiteHeader.logOutButton(), not(isVisible())),
  );

/**
 * Two scenarios reach this with different causes — no session at all, and a session that has since
 * expired — and one rule is what the visitor experiences either way: the profile is not reachable
 * without a live session, and asking for it lands them on the login page, looking at the form.
 *
 * It makes no claim about where they go afterwards, because it cannot: the frontend falls back to
 * `/profile` when there is no return URL, and `/profile` is the only guarded route, so a `returnUrl`
 * assertion would pass even if the feature were broken.
 */
export const EnsureAskedToLogIn = (): Task =>
  Task.where(
    '#actor ensures they are asked to log in first',
    Wait.until(Form.inputFor('Email address'), isVisible()),
    Ensure.that(Page.current().url().pathname, equals('/login')),
  );
