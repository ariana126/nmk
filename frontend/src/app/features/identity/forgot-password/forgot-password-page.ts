import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { email, FieldTree, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

import { toProblemDetails } from '../../../core/http/problem-details';
import { IdentityGateway } from '../../../core/identity/identity-gateway';
import { TextField } from '../../../ui/text-field/text-field';
import { toSubmissionErrors } from '../server-errors';

const REQUEST_FAILED = 'We could not send the reset link. Check your connection and try again.';

@Component({
  selector: 'app-forgot-password-page',
  imports: [TextField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
})
export class ForgotPasswordPage {
  private readonly identity = inject(IdentityGateway);
  private readonly appRef = inject(ApplicationRef);

  protected readonly model = signal({ email: '' });

  protected readonly f = form(this.model, (path) => {
    required(path.email, { message: 'Enter your email address.' });
    // Looser than the backend's `@IsEmail()` on purpose — `ariana@domain` passes here and is
    // rejected there, and that 400 is mapped back onto this field. The server owns the rule.
    email(path.email, { message: 'Enter a valid email address.' });
  });

  /**
   * The address the last accepted request went to, or `''` when none has been.
   *
   * A component signal rather than a form-level state, because the confirmation has to **survive
   * typing**. Submission errors live in a `linkedSignal` sourced on the field's value, so a root
   * error clears on the next keystroke — right for an error, wrong for a receipt that someone will
   * re-read the address of while checking their spelling.
   */
  private readonly sentTo = signal('');

  protected readonly confirmation = computed(() =>
    this.sentTo() === '' ? '' : `We have sent a link to reset your password to ${this.sentTo()}.`,
  );

  /** Errors with no field of their own — the ones the alert banner shows. */
  protected readonly formErrors = computed(() =>
    this.f()
      .errors()
      .map((error) => error.message)
      .filter((message): message is string => message !== undefined),
  );

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    // A receipt for the previous address stops being true the instant a new one is submitted.
    this.sentTo.set('');

    await submit(this.f, async () => {
      const address = this.model().email;

      try {
        await this.identity.requestPasswordReset({ email: address });
      } catch (error) {
        return toSubmissionErrors(toProblemDetails(error), { email: this.f.email }, REQUEST_FAILED);
      }

      this.sentTo.set(address);
      return undefined;
    });

    await this.moveFocusToOutcome();
  }

  /**
   * Focus follows the result, whatever it turned out to be: the first field the visitor can fix,
   * the alert when no single field is at fault, or the confirmation when there is nothing left to
   * do here. The live regions announce themselves, but a sighted keyboard user would otherwise be
   * left with their focus on a button whose job is finished.
   *
   * **The `whenStable()` is load-bearing.** Both banners collapse to `display: none` while they are
   * empty (`.alert:empty` in styles.css), and a `display: none` element silently refuses focus.
   * `submit()` resolves before change detection has rendered the content that un-collapses them, so
   * focusing here without waiting for that render is a no-op and the visitor is left on the button.
   * jsdom has no CSS cascade, so `display: none` is never computed there and a unit test cannot
   * fail on this — it is browser-only, and was found by driving the real page.
   */
  private async moveFocusToOutcome(): Promise<void> {
    await this.appRef.whenStable();

    const firstFieldError = this.f()
      .errorSummary()
      .find((error) => error.fieldTree !== undefined && error.fieldTree !== this.f);

    if (firstFieldError !== undefined) {
      (firstFieldError.fieldTree as FieldTree<string>)().focusBoundControl();
      return;
    }

    if (this.formErrors().length > 0) {
      document.getElementById('forgot-password-alert')?.focus();
      return;
    }

    if (this.sentTo() !== '') {
      document.getElementById('forgot-password-status')?.focus();
    }
  }
}
