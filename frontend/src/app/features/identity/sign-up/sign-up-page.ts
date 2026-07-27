import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { email, FieldTree, form, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { toProblemDetails } from '../../../core/http/problem-details';
import { IdentityGateway } from '../../../core/identity/identity-gateway';
import { TextField } from '../../../ui/text-field/text-field';
import { toSubmissionErrors } from '../server-errors';

const SIGN_UP_FAILED = 'We could not create your account. Check your connection and try again.';

/** The API rejects anything shorter; the hint beside the field says the same in the UI's words. */
const MINIMUM_PASSWORD_LENGTH = 12;

@Component({
  selector: 'app-sign-up-page',
  imports: [TextField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-up-page.html',
  styleUrl: './sign-up-page.css',
})
export class SignUpPage {
  private readonly identity = inject(IdentityGateway);
  private readonly router = inject(Router);

  /**
   * The form's own shape, which is deliberately **not** the API's DTO. The backend validates with
   * `forbidNonWhitelisted`, so any extra property here would be a 400 — and keeping the two types
   * separate means the compiler catches that at the gateway call rather than the server catching it
   * at runtime. A confirm-password field, if ever wanted, belongs in a sibling signal that is never
   * handed to the gateway.
   *
   * Keys are declared in the order they appear in the form. Never `null` or `undefined`.
   */
  protected readonly model = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  protected readonly f = form(this.model, (path) => {
    required(path.firstName, { message: 'Enter your first name.' });
    required(path.lastName, { message: 'Enter your last name.' });
    required(path.email, { message: 'Enter your email address.' });
    // Angular's rule is looser than the backend's `@IsEmail()` — `ariana@domain` passes here and is
    // rejected there. That is fine and deliberate: the server owns the rule, and its 400 is mapped
    // back onto this field. Do not tighten this to match, or the two will drift.
    email(path.email, { message: 'Enter a valid email address.' });
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
      const { firstName, lastName, email: address, password } = this.model();

      try {
        await this.identity.signUp({ email: address, password, firstName, lastName });
      } catch (error) {
        return toSubmissionErrors(toProblemDetails(error), this.targets(), SIGN_UP_FAILED);
      }

      // Past this point the account exists. A failure now is a *login* failure, and reporting it as
      // "we could not create your account" would be a lie that sends the user back to a form which
      // is guaranteed to answer 409. Hand them to the login page instead, where they can finish.
      try {
        await this.identity.logIn({ email: address, password });
      } catch {
        await this.router.navigate(['/login'], { queryParams: { created: '1', email: address } });
        return undefined;
      }

      await this.router.navigateByUrl('/profile');
      return undefined;
    });

    this.moveFocusToFirstError();
  }

  private targets(): Record<string, FieldTree<string>> {
    return {
      firstName: this.f.firstName,
      lastName: this.f.lastName,
      email: this.f.email,
      password: this.f.password,
    };
  }

  /**
   * `submit()` has settled both client and server errors by the time it resolves, so one pass
   * handles either. `errorSummary()` is ordered by document position, which is what makes "the first
   * invalid field" simply the first entry.
   */
  private moveFocusToFirstError(): void {
    const firstFieldError = this.f()
      .errorSummary()
      .find((error) => error.fieldTree !== undefined && error.fieldTree !== this.f);

    if (firstFieldError !== undefined) {
      (firstFieldError.fieldTree as FieldTree<string>)().focusBoundControl();
      return;
    }

    if (this.formErrors().length > 0) {
      document.getElementById('sign-up-alert')?.focus();
    }
  }
}
