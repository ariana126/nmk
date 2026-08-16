import { includes } from '@serenity-js/assertions';
import { By, PageElements, Text } from '@serenity-js/web';
import { Form } from './form';

/**
 * The page where a locked-out visitor asks for a reset link. A **Lean Page Object**: it names the
 * labels and the wording this page uses, and reports nothing else — the waiting, clicking and
 * asserting live in `screenplay/authentication/forgot-password.ts`.
 *
 * Everything but the way in delegates to {@link Form}, so the accessible-name lookups stay in one
 * place and a relabelled field is a one-line change here.
 */
export class ForgotPasswordPage {
  static emailField = () => Form.inputFor('Email address');

  static submitButton = () => Form.buttonCalled('Send reset link');

  /** "Check your email" — the app's acknowledgement that the request went through. */
  static confirmation = () =>
    Form.notice().describedAs('the reset request confirmation');

  /**
   * How a visitor gets here: the link beside the login form. Located by its text rather than by
   * anything structural, which is the sturdier of the two anchors available and the one the
   * accessibility gate has an opinion about.
   */
  static linkOnTheLoginPage = () =>
    PageElements.located(By.css('a'))
      .where(Text, includes('Forgot your password'))
      .first()
      .describedAs('the "Forgot your password?" link');
}
