import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FieldTree, form, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { toProblemDetails } from '../../../core/http/problem-details';
import { IdentityGateway } from '../../../core/identity/identity-gateway';
import { TextField } from '../../../ui/text-field/text-field';
import { toSubmissionErrors } from '../server-errors';

const RESET_FAILED = 'We could not change your password. Check your connection and try again.';

/** The API rejects anything shorter; the hint beside the field says the same in the UI's words. */
const MINIMUM_PASSWORD_LENGTH = 12;

@Component({
  selector: 'app-reset-password-page',
  imports: [TextField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.css',
})
export class ResetPasswordPage {
  private readonly identity = inject(IdentityGateway);
  private readonly router = inject(Router);
  private readonly appRef = inject(ApplicationRef);

  /**
   * The secret from the emailed link, bound from `?token=` by `withComponentInputBinding()`.
   *
   * Optional at runtime whatever default is declared — the binder writes `undefined` for a
   * parameter that is absent — so it is typed for what actually arrives. It is never rendered and
   * never bound to a control: it travels from the address bar to the request path and nowhere else.
   */
  readonly token = input<string>();

  /**
   * Whether there is a link to spend at all.
   *
   * Only emptiness is judged here. Whether a non-empty token is *real* is the server's question,
   * and it answers it with `password-reset-not-found` — guessing at a format client-side would
   * invent a second rule to drift from. The accessibility audit reaches this route with no token,
   * so the false branch is a page that has to stand on its own.
   */
  protected readonly hasToken = computed(() => (this.token() ?? '').trim() !== '');

  protected readonly model = signal({ password: '' });

  protected readonly f = form(this.model, (path) => {
    required(path.password, { message: 'Choose a password.' });
    minLength(path.password, MINIMUM_PASSWORD_LENGTH, {
      message: `Use at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
    });
  });

  /** Errors with no field of their own — the ones the alert banner shows. */
  protected readonly formErrors = computed(() =>
    this.f()
      .errors()
      .map((error) => error.message)
      .filter((message): message is string => message !== undefined),
  );

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.f, async () => {
      try {
        await this.identity.resetPassword(this.token() ?? '', this.model());
      } catch (error) {
        return toSubmissionErrors(
          toProblemDetails(error),
          { password: this.f.password },
          RESET_FAILED,
        );
      }

      // Deliberately no session: the reset proves control of the mailbox, not knowledge of the new
      // password. Sending them through the login form is what proves the second. Plain `/login`,
      // with nothing appended — the shell's live region already announces the new page by title.
      await this.router.navigateByUrl('/login');
      return undefined;
    });

    await this.moveFocusToFirstError();
  }

  /**
   * `submit()` has settled both client and server errors by the time it resolves, so one pass
   * handles either. `errorSummary()` is ordered by document position, which is what makes "the
   * first invalid field" the first entry rather than something to search for.
   *
   * **The `whenStable()` is load-bearing.** The alert collapses to `display: none` while it is
   * empty (`.alert:empty` in styles.css), and a `display: none` element silently refuses focus.
   * `submit()` resolves before change detection has rendered the message that un-collapses it, so
   * focusing without waiting for that render is a no-op — and on this page *every* server failure
   * is form-level, which makes it the common path rather than an edge case. jsdom has no CSS
   * cascade, so no unit test can fail on this; it was found by driving the real page.
   */
  private async moveFocusToFirstError(): Promise<void> {
    await this.appRef.whenStable();

    const firstFieldError = this.f()
      .errorSummary()
      .find((error) => error.fieldTree !== undefined && error.fieldTree !== this.f);

    if (firstFieldError !== undefined) {
      (firstFieldError.fieldTree as FieldTree<string>)().focusBoundControl();
      return;
    }

    if (this.formErrors().length > 0) {
      document.getElementById('reset-password-alert')?.focus();
    }
  }
}
