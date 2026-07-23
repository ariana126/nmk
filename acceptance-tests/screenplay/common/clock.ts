import { Answerable, Question, Task } from '@serenity-js/core';
import { PostRequest, Send } from '@serenity-js/rest';

/**
 * Freeze the backend clock at a given instant. Everything time-derived from then
 * on — JWT `iat`, token expiry, `registeredAt` — is stamped from this value until
 * it is changed again.
 */
export const FreezeTimeAt = (instant: Answerable<Date | string>): Task =>
  Task.where(
    '#actor freezes time',
    Send.a(
      PostRequest.to('testing/clock').with(
        Question.about('the instant to freeze time at', async (actor) => {
          const value = await actor.answer(instant);
          return { now: value instanceof Date ? value.toISOString() : value };
        }),
      ),
    ),
  );

/**
 * Advance the backend clock forward by a number of milliseconds from its current
 * frozen instant — e.g. to move past a token's expiry without freezing at a
 * magic timestamp.
 */
export const LetTimePass = (milliseconds: Answerable<number>): Task =>
  Task.where(
    '#actor lets time pass',
    Send.a(
      PostRequest.to('testing/clock/advance').with(
        Question.about('the amount of time to advance', async (actor) => ({
          milliseconds: await actor.answer(milliseconds),
        })),
      ),
    ),
  );
