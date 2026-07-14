import { Question, QuestionAdapter, Task } from '@serenity-js/core';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { TheirAccessToken } from '../common/notes';

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const TheirAuthorizationHeader = (): QuestionAdapter<string> =>
  Question.about(
    'their authorization header',
    async (actor) => `Bearer ${await actor.answer(TheirAccessToken())}`,
  );

export const ViewTheirProfile = (): Task =>
  Task.where(
    '#actor views their profile',
    Send.a(
      GetRequest.to('users/me').using({
        headers: { Authorization: TheirAuthorizationHeader() },
      }),
    ),
  );

export const TheProfile = (): QuestionAdapter<Profile> =>
  LastResponse.body<Profile>();
