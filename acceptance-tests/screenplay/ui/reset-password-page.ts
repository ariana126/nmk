import { Form } from './form';

/**
 * The page the emailed link opens (`/reset-password?token=…`), where the visitor chooses a new
 * password. A **Lean Page Object**, like {@link ForgotPasswordPage}: labels and button text, and
 * nothing else.
 *
 * There is no error locator here on purpose. Every way a reset can fail — expired link, link
 * already used, weak password — is exercised through the API, so nothing in this suite looks at
 * this page's error state and a locator for it would be speculation.
 */
export class ResetPasswordPage {
  static newPasswordField = () => Form.inputFor('New password');

  static submitButton = () => Form.buttonCalled('Set new password');
}
