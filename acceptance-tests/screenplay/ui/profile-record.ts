import { equals } from '@serenity-js/assertions';
import { By, PageElement, PageElements, Text } from '@serenity-js/web';

/**
 * The account details the profile page renders, as a Lean Page Object.
 *
 * The page is a description list, so a value is found by the term that labels it — the way a
 * person reads it — rather than by position. The locators are the list's own semantics
 * (`dl`/`dt`/`dd`), which the page cannot drop without ceasing to be a description list.
 */
export class ProfileRecord {
  static valueOf = (term: string) =>
    ProfileRecord.value()
      .of(ProfileRecord.rowFor(term))
      .describedAs(`the "${term}" shown on their profile`);

  private static rowFor = (term: string) =>
    ProfileRecord.rows()
      .where(Text.of(ProfileRecord.term()), equals(term))
      .first();

  private static rows = () =>
    PageElements.located(By.css('dl div')).describedAs('profile rows');

  private static term = () => PageElement.located(By.css('dt'));

  private static value = () => PageElement.located(By.css('dd'));
}
