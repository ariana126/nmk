import {
  Answerable,
  d,
  Question,
  QuestionAdapter,
  Task,
} from '@serenity-js/core';
import {
  contain,
  Ensure,
  equals,
  isPresent,
  startsWith,
} from '@serenity-js/assertions';
import { LastResponse } from '@serenity-js/rest';

const problemTypeBaseUrl = 'https://my-api-doc.dev/problems';

export interface ProblemDetailBody {
  type: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Array<{ field: string; message: string }>;
}

export const problemTypeFor = (slug: string): string =>
  `${problemTypeBaseUrl}/${slug}`;

/**
 * The RFC 9457 envelope, asserted once for every error response.
 * Asserts `type` rather than `detail`, since `detail` is optional per the RFC.
 */
export const EnsureProblemDetail = (status: number, slug: string): Task =>
  Task.where(
    `#actor ensures the response is a "${slug}" problem detail`,
    Ensure.that(LastResponse.status(), equals(status)),
    Ensure.that(
      LastResponse.header('content-type'),
      startsWith('application/problem+json'),
    ),
    Ensure.that(
      LastResponse.body<ProblemDetailBody>().type,
      equals(problemTypeFor(slug)),
    ),
    Ensure.that(LastResponse.body<ProblemDetailBody>().title, isPresent()),
    Ensure.that(LastResponse.body<ProblemDetailBody>().status, equals(status)),
  );

export const FieldsThatFailedValidation = (): QuestionAdapter<string[]> =>
  Question.about('the fields that failed validation', async (actor) => {
    const body = await actor.answer(LastResponse.body<ProblemDetailBody>());
    return (body.errors ?? []).map((error) => error.field);
  });

/**
 * The backend reports weak passwords, invalid emails and missing data all as the same
 * `validation-error` problem type — the offending field is what tells them apart.
 */
export const EnsureValidationErrorFor = (field: Answerable<string>): Task =>
  Task.where(
    d`#actor ensures validation failed for ${field}`,
    EnsureProblemDetail(400, 'validation-error'),
    Ensure.that(FieldsThatFailedValidation(), contain(field)),
  );
