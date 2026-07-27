import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { email, FieldTree, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { toProblemDetails } from '../../../core/http/problem-details';
import { IdentityGateway } from '../../../core/identity/identity-gateway';
import { TextField } from '../../../ui/text-field/text-field';
import { toSubmissionErrors } from '../server-errors';

const LOGIN_FAILED = 'We could not log you in. Check your connection and try again.';

@Component({
  selector: 'app-login-page',
  imports: [TextField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly identity = inject(IdentityGateway);
  private readonly router = inject(Router);

  /**
   * Bound from the query string by `withComponentInputBinding()`. All three are optional at runtime
   * whatever default is declared — the binder writes `undefined` for a parameter that is absent —
   * so they are typed for what actually arrives rather than for what we would like.
   */
  readonly returnUrl = input<string>();
  readonly created = input<string>();
  readonly email = input<string>();

  /**
   * `linkedSignal`, not `signal`, so the address handed over from sign-up lands in the field.
   * Inputs are not bound yet when the constructor runs, so reading `email()` there gives nothing;
   * deriving the model from the input means it is filled in as soon as the value exists, and reset
   * if the route's parameters ever change again.
   */
  protected readonly model = linkedSignal(() => ({ email: this.email() ?? '', password: '' }));

  protected readonly f = form(this.model, (path) => {
    required(path.email, { message: 'Enter your email address.' });
    email(path.email, { message: 'Enter a valid email address.' });
    required(path.password, { message: 'Enter your password.' });
  });

  /** True when arriving straight from a successful sign-up that could not log the user in. */
  protected readonly justCreated = computed(() => this.created() === '1');

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
        await this.identity.logIn(this.model());
      } catch (error) {
        return toSubmissionErrors(
          toProblemDetails(error),
          { email: this.f.email, password: this.f.password },
          LOGIN_FAILED,
        );
      }

      await this.router.navigateByUrl(this.safeReturnUrl());
      return undefined;
    });

    this.moveFocusToFirstError();
  }

  /**
   * `returnUrl` arrives from the address bar, so it is attacker-controlled. Only a path on this
   * origin is acceptable: `https://evil.example` and the protocol-relative `//evil.example` are
   * both destinations the router would happily send someone to.
   */
  private safeReturnUrl(): string {
    const url = this.returnUrl() ?? '';

    return url.startsWith('/') && !url.startsWith('//') ? url : '/profile';
  }

  /**
   * `submit()` has settled both client and server errors by the time it resolves, so one pass
   * handles either. `errorSummary()` is ordered by document position, which is what makes "the
   * first invalid field" the first entry rather than something to search for.
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
      document.getElementById('login-alert')?.focus();
    }
  }
}
