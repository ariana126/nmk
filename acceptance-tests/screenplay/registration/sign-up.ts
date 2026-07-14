import { Answerable, notes, Question, QuestionAdapter, Task } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { LastResponse, PostRequest, Send } from '@serenity-js/rest';
import { AccountNotes, TheDetailsTheySignedUpWith } from '../common/notes';
import { EnsureProblemDetail } from '../common/problem-detail';
import { requiredSignUpFields, SignUpPayload } from './sign-up-details';

export const SignUp = (details: Answerable<SignUpPayload>): Task =>
  Task.where(
    '#actor signs up',
    notes<AccountNotes>().set('details', details),
    Send.a(PostRequest.to('users').with(details)),
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

export const EnsureRejectedAsDuplicateEmail = (): Task =>
  Task.where(
    '#actor ensures the sign-up was rejected as a duplicate email',
    EnsureProblemDetail(409, 'user-already-exists'),
  );
