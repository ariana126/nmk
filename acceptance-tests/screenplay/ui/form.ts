import { equals, includes } from '@serenity-js/assertions';
import { By, PageElement, PageElements, Text } from '@serenity-js/web';

/**
 * The identity pages' form, as a **Lean Page Object**: it locates elements and reports what they
 * say. It never asserts, never exposes the driver, and returns no tasks — behaviour lives in the
 * screenplay tasks that use it.
 *
 * Fields are found by their visible `<label>`, not by id, so a locator reads the way the scenario
 * does ("Email address") and survives a rename of the underlying control. That lookup is safe to
 * rely on because `make lint-accessibility` fails the build if any input loses its `<label for>`.
 *
 * The class names below (`.field__error`) belong to the single shared `app-text-field` component
 * rather than to page styling, so there is exactly one place they can change.
 */
export class Form {
  static inputFor = (label: string) =>
    Form.input()
      .of(Form.fieldCalled(label))
      .describedAs(`the "${label}" field`);

  static errorFor = (label: string) =>
    Form.error()
      .of(Form.fieldCalled(label))
      .describedAs(`the error message for the "${label}" field`);

  static buttonCalled = (name: string) =>
    Form.buttons()
      .where(Text, includes(name))
      .first()
      .describedAs(`the "${name}" button`);

  /**
   * The form-level error banner.
   *
   * It is **always in the DOM and empty** when there is nothing to report, so its presence proves
   * nothing — ask whether it is *visible* (`.alert:empty { display: none }` in the app's
   * stylesheet) or what it *says*.
   */
  static errorSummary = () =>
    PageElement.located(By.css('form [role="alert"]')).describedAs(
      'the form error summary',
    );

  /**
   * The form-level *good news* banner — the `role="status"` counterpart of the summary above,
   * already how the login page announces a freshly created account. Like the summary it is
   * announced to a screen reader, so it is the thing a visitor is actually told.
   */
  static notice = () =>
    PageElement.located(By.css('form [role="status"]')).describedAs(
      'the form notice',
    );

  private static fieldCalled = (label: string) =>
    Form.fields().where(Text.of(Form.label()), equals(label)).first();

  /** One `<app-text-field>` per field — the component boundary, not a styling class. */
  private static fields = () =>
    PageElements.located(By.css('form app-text-field')).describedAs(
      'form fields',
    );

  /** Scoped to the form, so the site header's own buttons can never match. */
  private static buttons = () =>
    PageElements.located(By.css('form button')).describedAs('form buttons');

  private static label = () => PageElement.located(By.css('label'));

  private static input = () => PageElement.located(By.css('input'));

  private static error = () => PageElement.located(By.css('.field__error'));
}
