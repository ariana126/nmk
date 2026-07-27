import {
  Answerable,
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
import { Click, Enter, isVisible, Page, Text } from '@serenity-js/web';
import { TheDetailsTheySignedUpWith } from '../common/notes';
import { Form } from '../ui/form';
import { SiteHeader } from '../ui/site-header';

export interface Credentials {
  email?: string;
  password?: string;
}

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
 * The same two routes as {@link SignUp}, for the same reason.
 *
 * `using` is what the scenarios demonstrating a visitor's journey take; `viaApiUsing` is what the
 * validation outlines take, where "and of course they still can't get in" is a consequence being
 * confirmed rather than a behaviour being shown.
 */
export class LogIn {
  static using = (credentials: Answerable<Credentials>): Task =>
    Task.where(
      '#actor logs in',
      LocateTheLoginForm(),
      // Only complete credentials ever reach a form; the partial ones belong to the API route.
      FillInTheLoginForm(
        Question.fromObject<Credentials>(credentials) as QuestionAdapter<
          Required<Credentials>
        >,
      ),
      SubmitTheLoginForm(),
    );

  static viaApiUsing = (credentials: Answerable<Credentials>): Task =>
    Task.where(
      '#actor logs in (via the API)',
      Send.a(PostRequest.to('auth/login').with(credentials)),
    );
}

/**
 * Via the header rather than a direct URL, because both callers are already looking at a page and
 * that is the link a visitor would actually use. A scenario that needs to start cold would add a
 * `viaDirectNavigation` variant beside this one rather than change it.
 */
const LocateTheLoginForm = (): Task =>
  Task.where(
    '#actor locates the login form via the site header',
    // See the note on LocateTheSignUpForm for why each click is preceded by a wait.
    Wait.until(SiteHeader.logInLink(), isVisible()),
    Click.on(SiteHeader.logInLink()),
    Wait.until(Form.inputFor('Email address'), isVisible()),
  );

const FillInTheLoginForm = (
  credentials: QuestionAdapter<Required<Credentials>>,
): Task =>
  Task.where(
    '#actor fills in the login form',
    Enter.theValue(credentials.email).into(Form.inputFor('Email address')),
    Enter.theValue(credentials.password).into(Form.inputFor('Password')),
  );

const SubmitTheLoginForm = (): Task =>
  Task.where(
    '#actor submits the login form',
    Click.on(Form.buttonCalled('Log in')),
  );

export const LogOut = (): Task =>
  Task.where(
    '#actor logs out',
    Wait.until(SiteHeader.logOutButton(), isVisible()),
    Click.on(SiteHeader.logOutButton()),
  );

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
 * A rejected sign-up leaves the actor holding a payload that may itself be malformed, so
 * logging in with it fails validation (400) when the email was the invalid or missing part,
 * and fails authentication (401) otherwise. Either way no token is issued — which is what
 * "should not be able to login" actually means.
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
