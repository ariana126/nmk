import { notes, Question, QuestionAdapter, Task } from '@serenity-js/core';
import { appBaseUrl } from '../../support/config';
import {
  CheckTheirInbox,
  EmailMessage,
  TheMessagesInTheirInbox,
} from '../common/inbox';
import { AccountNotes } from '../common/notes';

/**
 * The one place that knows what a password reset email looks like. Rewording the message, or
 * moving the link inside it, is a change to this pattern and to nothing else.
 */
const resetLinkPattern = new RegExp(
  `${escapedForRegExp(appOrigin())}/reset-password\\?token=[^\\s"'<>)\\]]+`,
);

/**
 * Reads the inbox and notes down the link, so every later step — following it in a browser or
 * picking the token out of it for an API call — works from the same remembered value.
 */
export const CheckTheirInboxForTheResetLink = (): Task =>
  Task.where(
    '#actor checks their inbox for the password reset link',
    CheckTheirInbox(),
    notes<AccountNotes>().set('resetLink', TheLinkInTheLatestMessage()),
  );

export const TheResetLinkTheyWereSent = (): QuestionAdapter<string> =>
  notes<AccountNotes>()
    .get('resetLink')
    .describedAs('the reset link they were sent');

export const TheResetTokenTheyWereSent = (): QuestionAdapter<string> =>
  Question.about('the reset token they were sent', async (actor) => {
    const link = await actor.answer(TheResetLinkTheyWereSent());
    const token = new URL(link).searchParams.get('token');
    if (!token) {
      throw new Error(`The reset link carries no token: ${link}`);
    }
    return token;
  });

/** Messages arrive newest first, so the first one carrying a link is the current one. */
const TheLinkInTheLatestMessage = (): QuestionAdapter<string> =>
  Question.about('the reset link in the latest message', async (actor) => {
    const messages = await actor.answer(TheMessagesInTheirInbox());
    const link = messages
      .map((message: EmailMessage) => resetLinkPattern.exec(message.body)?.[0])
      .find((match) => match !== undefined);

    if (!link) {
      throw new Error(
        `No password reset link found in ${messages.length} message(s); ` +
          `expected one matching ${resetLinkPattern.source}`,
      );
    }
    return link;
  });

function appOrigin(): string {
  return appBaseUrl.replace(/\/$/, '');
}

function escapedForRegExp(value: string): string {
  return value.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&');
}
