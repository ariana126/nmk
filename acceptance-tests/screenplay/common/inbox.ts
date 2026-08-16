import { Question, QuestionAdapter, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { TheDetailsTheySignedUpWith } from './notes';

/** One message the backend's test-only inbox is holding. */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

/**
 * The actor reading their own email.
 *
 * The real email provider isn't decided yet, so the backend exposes a test-only inbox
 * (`GET testing/emails?to=…`) in its place. Unlike the hook traffic in `support/hooks.ts` — which
 * uses a raw `fetch` precisely because resetting a database is nobody's *behaviour* — checking an
 * inbox is something the actor does, and belongs in the living documentation alongside the rest of
 * the journey. Hence `CallAnApi`, and hence the no-leading-slash rule applying here.
 */
export const CheckTheirInbox = (): Task =>
  Task.where('#actor checks their inbox', Send.a(GetRequest.to(TheirInbox())));

/**
 * The messages the inbox just returned, newest first.
 *
 * This reads the *last response*, so it only answers correctly while that response is still the
 * inbox's. Ask it in the same task that performed {@link CheckTheirInbox}, and note down anything
 * later steps need — `screenplay/authentication/reset-link.ts` is the worked example.
 */
export const TheMessagesInTheirInbox = (): QuestionAdapter<EmailMessage[]> =>
  LastResponse.body<EmailMessage[]>().describedAs(
    'the messages in their inbox',
  );

const TheirInbox = (): QuestionAdapter<string> =>
  Question.about('their inbox', async (actor) => {
    const details = await actor.answer(TheDetailsTheySignedUpWith());
    return `testing/emails?to=${encodeURIComponent(details.email ?? '')}`;
  });
