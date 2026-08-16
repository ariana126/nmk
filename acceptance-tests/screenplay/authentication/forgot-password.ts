import {
  Answerable,
  Question,
  QuestionAdapter,
  Task,
  Wait,
} from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { LastResponse, PostRequest, PutRequest, Send } from '@serenity-js/rest';
import { Click, Enter, isVisible, Navigate, Page } from '@serenity-js/web';
import { EnsureProblemDetail } from '../common/problem-detail';
import { ForgotPasswordPage } from '../ui/forgot-password-page';
import { ResetPasswordPage } from '../ui/reset-password-page';
import { SiteHeader } from '../ui/site-header';
import {
  CheckTheirInboxForTheResetLink,
  TheResetLinkTheyWereSent,
  TheResetTokenTheyWereSent,
} from './reset-link';

/**
 * Asking to be sent a reset link, by either door — the same arrangement as `SignUp` and `LogIn`,
 * and for the same reason: the goal names the class, the route names the method.
 *
 * `using` drives the form, and only the "Successful password reset" journey takes it. Everything
 * else — the unknown-email rejection and the two preconditions — takes `viaApiUsing`, because
 * those scenarios are about a backend rule or about a state that merely has to be true.
 */
export class RequestAPasswordReset {
  static using = (email: Answerable<string>): Task =>
    Task.where(
      '#actor requests a password reset',
      LocateTheForgotPasswordForm(),
      FillInTheForgotPasswordForm(email),
      SubmitTheForgotPasswordForm(),
    );

  static viaApiUsing = (email: Answerable<string>): Task =>
    Task.where(
      '#actor requests a password reset (via the API)',
      Send.a(
        PostRequest.to('password-resets').with(
          Question.fromObject<{ email: string }>({ email }),
        ),
      ),
    );
}

/**
 * Choosing a new password with the link the actor was sent.
 *
 * Both routes start by checking the inbox, so neither depends on a step having read it earlier —
 * the link is remembered on the actor's notepad and the browser and the API then use the same one.
 * That is what lets "he sets *another* password using the same reset link" mean what it says.
 */
export class ResetTheirPassword {
  static using = (password: Answerable<string>): Task =>
    Task.where(
      '#actor sets a new password',
      CheckTheirInboxForTheResetLink(),
      LocateTheResetPasswordForm(),
      FillInTheResetPasswordForm(password),
      SubmitTheResetPasswordForm(),
    );

  static viaApiUsing = (password: Answerable<string>): Task =>
    Task.where(
      '#actor sets a new password (via the API)',
      CheckTheirInboxForTheResetLink(),
      Send.a(
        PutRequest.to(ThePasswordResetResource()).with(
          Question.fromObject<{ password: string }>({ password }),
        ),
      ),
    );
}

/**
 * The link arrives by email, so a visitor reaching this form has not navigated to it — they have
 * followed it. Navigating to the noted link is therefore the honest way to locate this form, and
 * the wait that ends the task is what lets the next one simply type (see `LocateTheSignUpForm`).
 */
const LocateTheResetPasswordForm = (): Task =>
  Task.where(
    '#actor follows the reset link they were sent',
    Navigate.to(TheResetLinkTheyWereSent()),
    Wait.until(ResetPasswordPage.newPasswordField(), isVisible()),
  );

const FillInTheResetPasswordForm = (password: Answerable<string>): Task =>
  Task.where(
    '#actor fills in the reset password form',
    Enter.theValue(password).into(ResetPasswordPage.newPasswordField()),
  );

/**
 * Ends by waiting for the login page rather than returning the moment the button is clicked. Two
 * reasons, both practical: setting a new password deliberately does *not* create a session, so the
 * login page is where a successful reset lands; and without the wait the next step could reach for
 * the header's "Log in" link while the request is still in flight, and navigate away mid-reset.
 */
const SubmitTheResetPasswordForm = (): Task =>
  Task.where(
    '#actor submits the reset password form',
    Click.on(ResetPasswordPage.submitButton()),
    Wait.until(Page.current().url().pathname, equals('/login')),
  );

/**
 * Via the login page, because that is where somebody who cannot get in actually starts — which
 * makes the "Forgot your password?" link part of what this journey demonstrates rather than a
 * detail to shortcut past. A scenario needing to arrive cold would add a `viaDirectNavigation`
 * variant beside this rather than change it.
 */
const LocateTheForgotPasswordForm = (): Task =>
  Task.where(
    '#actor locates the forgot-password form via the login page',
    Navigate.to('/'),
    Wait.until(SiteHeader.logInLink(), isVisible()),
    Click.on(SiteHeader.logInLink()),
    Wait.until(ForgotPasswordPage.linkOnTheLoginPage(), isVisible()),
    Click.on(ForgotPasswordPage.linkOnTheLoginPage()),
    Wait.until(ForgotPasswordPage.emailField(), isVisible()),
  );

const FillInTheForgotPasswordForm = (email: Answerable<string>): Task =>
  Task.where(
    '#actor fills in the forgot-password form',
    Enter.theValue(email).into(ForgotPasswordPage.emailField()),
  );

/**
 * The confirmation is this task's completion signal, not an assertion the scenario asked for: the
 * email cannot be in the inbox before the app says it has been sent, and the very next step goes
 * looking for it.
 */
const SubmitTheForgotPasswordForm = (): Task =>
  Task.where(
    '#actor submits the forgot-password form',
    Click.on(ForgotPasswordPage.submitButton()),
    Wait.until(ForgotPasswordPage.confirmation(), isVisible()),
  );

const ThePasswordResetResource = (): QuestionAdapter<string> =>
  Question.about('the password reset resource', async (actor) => {
    const token = await actor.answer(TheResetTokenTheyWereSent());
    return `password-resets/${token}/password`;
  });

export const EnsurePasswordResetRequested = (): Task =>
  Task.where(
    '#actor ensures a password reset was requested',
    Ensure.that(LastResponse.status(), equals(201)),
  );

export const EnsurePasswordReset = (): Task =>
  Task.where(
    '#actor ensures their password was reset',
    Ensure.that(LastResponse.status(), equals(204)),
  );

/**
 * Unlike a weak password or a malformed address, an email nobody has registered gets a problem
 * type of its own — so this is the envelope check plus the one fact that distinguishes it.
 */
export const EnsureRejectedAsUnknownEmail = (): Task =>
  Task.where(
    '#actor ensures the request was rejected as an unknown email',
    EnsureProblemDetail(404, 'user-not-found'),
  );

/**
 * 410 Gone for both of the ways a link stops working: it existed, it does not any more. What
 * separates them is the problem type, which is the whole reason to assert `type` rather than the
 * optional `detail`.
 */
export const EnsureResetLinkExpired = (): Task =>
  Task.where(
    '#actor ensures the reset link had expired',
    EnsureProblemDetail(410, 'password-reset-expired'),
  );

export const EnsureResetLinkAlreadyUsed = (): Task =>
  Task.where(
    '#actor ensures the reset link had already been used',
    EnsureProblemDetail(410, 'password-reset-already-used'),
  );
