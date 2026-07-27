import { equals } from '@serenity-js/assertions';
import { By, PageElement, PageElements, Text } from '@serenity-js/web';

/**
 * The banner every page carries. A Lean Page Object: it locates, and reports nothing else.
 *
 * The header is also the suite's cheapest signal for *whether the actor has a session* — it offers
 * "Profile" and "Log out" when they do, "Log in" and "Create an account" when they don't.
 */
export class SiteHeader {
  /** The only `<button>` in the header, and it renders only for a signed-in visitor. */
  static logOutButton = () =>
    PageElement.located(By.css('app-site-header button')).describedAs(
      'the "Log out" button',
    );

  static profileLink = () => SiteHeader.linkCalled('Profile');

  static logInLink = () => SiteHeader.linkCalled('Log in');

  static createAccountLink = () => SiteHeader.linkCalled('Create an account');

  private static linkCalled = (name: string) =>
    SiteHeader.links()
      .where(Text, equals(name))
      .first()
      .describedAs(`the "${name}" link`);

  private static links = () =>
    PageElements.located(By.css('app-site-header a')).describedAs(
      'site header links',
    );
}
