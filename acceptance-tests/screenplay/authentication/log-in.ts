import { Answerable, notes, Question, QuestionAdapter, Task } from '@serenity-js/core';
import { Ensure, equals, isPresent, not } from '@serenity-js/assertions';
import { LastResponse, PostRequest, Send } from '@serenity-js/rest';
import { AccountNotes, TheDetailsTheySignedUpWith } from '../common/notes';
import { EnsureProblemDetail } from '../common/problem-detail';

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

export const LogIn = (credentials: Answerable<Credentials>): Task =>
  Task.where(
    '#actor logs in',
    Send.a(PostRequest.to('auth/login').with(credentials)),
  );

export const EnsureLoggedIn = (): Task =>
  Task.where(
    '#actor ensures they are logged in',
    Ensure.that(LastResponse.status(), equals(200)),
    Ensure.that(LastResponse.body<AccessTokenBody>().accessToken, isPresent()),
    notes<AccountNotes>().set(
      'accessToken',
      LastResponse.body<AccessTokenBody>().accessToken,
    ),
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

export const EnsureCredentialsRejected = (): Task =>
  Task.where(
    '#actor ensures their credentials were rejected',
    EnsureProblemDetail(401, 'invalid-credentials'),
  );
