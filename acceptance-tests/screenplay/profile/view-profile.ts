import { Question, QuestionAdapter, Task, Wait } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { Click, isVisible, Navigate, Page, Text } from '@serenity-js/web';
import { TheDetailsTheySignedUpWith } from '../common/notes';
import { ProfileRecord } from '../ui/profile-record';
import { SiteHeader } from '../ui/site-header';

/**
 * One goal, two routes, with the route in the method name.
 *
 * - `viaTheSiteHeader` clicks "Profile" — what a signed-in visitor does, and the only route
 *   available to them, since the link is all the site offers.
 * - `viaDirectNavigation` asks the browser for `/profile` outright. Two scenarios need it and
 *   neither could take the header: an anonymous visitor is offered no "Profile" link to click,
 *   and a visitor whose session has expired while looking at the page needs the page *fetched
 *   again* — a router-internal navigation to the URL already open re-renders nothing, so no
 *   request goes out, nothing is refused, and the scenario would pass while proving nothing.
 *   It deliberately waits for nothing afterwards: whether the profile even loads is the question
 *   its callers are asking.
 */
export class ViewTheirProfile {
  static viaTheSiteHeader = (): Task =>
    Task.where(
      '#actor views their profile',
      Wait.until(SiteHeader.profileLink(), isVisible()),
      Click.on(SiteHeader.profileLink()),
      Wait.until(Page.current().url().pathname, equals('/profile')),
    );

  static viaDirectNavigation = (): Task =>
    Task.where('#actor goes to their profile page', Navigate.to('/profile'));
}

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
