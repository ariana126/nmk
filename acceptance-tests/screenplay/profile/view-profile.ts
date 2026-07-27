import { Question, QuestionAdapter, Task, Wait } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { Click, isVisible, Page, Text } from '@serenity-js/web';
import { TheDetailsTheySignedUpWith } from '../common/notes';
import { ProfileRecord } from '../ui/profile-record';
import { SiteHeader } from '../ui/site-header';

export const ViewTheirProfile = (): Task =>
  Task.where(
    '#actor views their profile',
    Wait.until(SiteHeader.profileLink(), isVisible()),
    Click.on(SiteHeader.profileLink()),
    Wait.until(Page.current().url().pathname, equals('/profile')),
  );

/**
 * The page renders a name, not two fields — so this is what the actor is actually looking at.
 */
const TheirFullName = (): QuestionAdapter<string> =>
  Question.about('their full name', async (actor) => {
    const details = await actor.answer(TheDetailsTheySignedUpWith());
    return `${details.firstName} ${details.lastName}`;
  });

/**
 * What the profile page presents, checked against what the actor typed into the sign-up form —
 * the round trip the whole journey exists to prove.
 *
 * There is no assertion on the account's id: the page does not show one, and a UI test can only
 * speak for what the UI presents.
 */
export const EnsureProfileMatchesSignUpDetails = (): Task =>
  Task.where(
    '#actor ensures their profile matches the details they signed up with',
    // The page fetches the profile after it renders, so the record arrives a beat late.
    Wait.until(ProfileRecord.valueOf('Email address'), isVisible()),
    Ensure.that(
      Text.of(ProfileRecord.valueOf('Name')),
      equals(TheirFullName()),
    ),
    Ensure.that(
      Text.of(ProfileRecord.valueOf('Email address')),
      equals(TheDetailsTheySignedUpWith().email),
    ),
  );
