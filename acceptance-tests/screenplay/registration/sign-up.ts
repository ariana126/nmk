import {
  Answerable,
  notes,
  Question,
  QuestionAdapter,
  Task,
  Wait,
} from '@serenity-js/core';
import { Ensure, equals, includes } from '@serenity-js/assertions';
import { LastResponse, PostRequest, Send } from '@serenity-js/rest';
import {
  Click,
  Enter,
  isVisible,
  Navigate,
  Page,
  Text,
} from '@serenity-js/web';
import { AccountNotes, TheDetailsTheySignedUpWith } from '../common/notes';
import { Form } from '../ui/form';
import { SiteHeader } from '../ui/site-header';
import {
  requiredSignUpFields,
  SignUpDetails,
  SignUpPayload,
} from './sign-up-details';

/**
 * Two routes to one goal, so each scenario can take the one that suits it — *blended testing*
 * (BDD in Action, ch15). The names describe the goal; only the difference is in the method name,
 * which is what lets one substitute for the other.
 *
 * - `using` fills in the sign-up form in a browser. The scenarios that demonstrate **how** a
 *   visitor signs up take this route.
 * - `viaApiUsing` posts the payload straight to the API. Preconditions ("Ariana already has an
 *   account") and the validation outlines take this one: they are about a backend rule, and
 *   fifteen examples through a form would spend minutes proving what the API proves in
 *   milliseconds — the waste ch10 warns about.
 *
 * Either way the actor notes down what they submitted, so later steps read it back without
 * caring which route ran.
 */
export class SignUp {
  static using = (details: Answerable<SignUpPayload>): Task =>
    Task.where(
      '#actor signs up',
      notes<AccountNotes>().set('details', details),
      LocateTheSignUpForm(),
      // Only complete details ever reach a form: the payloads with a field missing belong to the
      // "Missing data" outline, which never opens a browser.
      FillInTheSignUpForm(
        TheDetailsTheySignedUpWith() as QuestionAdapter<SignUpDetails>,
      ),
      SubmitTheSignUpForm(),
    );

  static viaApiUsing = (details: Answerable<SignUpPayload>): Task =>
    Task.where(
      '#actor signs up (via the API)',
      notes<AccountNotes>().set('details', details),
      Send.a(PostRequest.to('users').with(details)),
    );
}

/**
 * Angular bootstraps the shell and lazy-loads each route *after* the browser's load event, so
 * anything reaching into freshly rendered markup has to wait for it. `Wait.until` is what can:
 * it treats an as-yet-empty match as "not yet" and polls, where `Click` and `Enter` fail on the
 * spot with a `ListItemNotFoundError`. Locating is this task's job, so the waiting belongs here
 * rather than in the tasks that go on to fill the form in.
 */
const LocateTheSignUpForm = (): Task =>
  Task.where(
    '#actor locates the sign-up form via the home page',
    Navigate.to('/'),
    Wait.until(SiteHeader.createAccountLink(), isVisible()),
    Click.on(SiteHeader.createAccountLink()),
    Wait.until(Form.inputFor('Email address'), isVisible()),
  );

const FillInTheSignUpForm = (details: QuestionAdapter<SignUpDetails>): Task =>
  Task.where(
    '#actor fills in the sign-up form',
    Enter.theValue(details.firstName).into(Form.inputFor('First name')),
    Enter.theValue(details.lastName).into(Form.inputFor('Last name')),
    Enter.theValue(details.email).into(Form.inputFor('Email address')),
    Enter.theValue(details.password).into(Form.inputFor('Password')),
  );

const SubmitTheSignUpForm = (): Task =>
  Task.where(
    '#actor submits the sign-up form',
    Click.on(Form.buttonCalled('Create account')),
  );

export const EnsureSignedUp = (): Task =>
  Task.where(
    '#actor ensures they are signed up',
    Ensure.that(LastResponse.status(), equals(201)),
  );

/**
 * The "missing data" scenario doesn't name the field in its Then step, so recover it by
 * comparing what the actor submitted against what the backend requires.
 */
export const TheOmittedSignUpField = (): QuestionAdapter<string> =>
  Question.about('the required field they omitted', async (actor) => {
    const details = await actor.answer(TheDetailsTheySignedUpWith());
    return requiredSignUpFields.filter(
      (field) => details[field] === undefined,
    )[0];
  });

/**
 * Asserted through the UI, because the rule this scenario documents is about the screen: the
 * backend's `409 user-already-exists` is only worth anything if the visitor is told what went
 * wrong and where. The message is deliberately checked on the **email field**, not the form
 * banner — putting it beside the offending input is the behaviour under test.
 */
export const EnsureRejectedAsDuplicateEmail = (): Task =>
  Task.where(
    '#actor ensures the sign-up was rejected as a duplicate email',
    Wait.until(Form.errorFor('Email address'), isVisible()),
    Ensure.that(
      Text.of(Form.errorFor('Email address')),
      includes('An account with this email already exists'),
    ),
    Ensure.that(Page.current().url().pathname, equals('/sign-up')),
  );
