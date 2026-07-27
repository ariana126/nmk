import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';

/**
 * A labelled text input bound to a signal-form field.
 *
 * It owns the wiring that is easy to get subtly wrong and impossible to see in review: the
 * `<label for>` pairing, the `aria-describedby` composition, `aria-invalid` being absent rather than
 * `"false"`, and the error paragraph's id matching what the control points at. Doing that once here
 * is the difference between four chances to forget and none.
 *
 * `[formField]` binds the inner `<input>`, so `focusBoundControl()` on the field still resolves to
 * the real control and focus management keeps working through the wrapper.
 */
@Component({
  selector: 'app-text-field',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <label class="field__label" [for]="name()">{{ label() }}</label>

      @if (hint() !== '') {
        <p class="field__hint" [id]="name() + '-hint'">{{ hint() }}</p>
      }

      <input
        class="field__control"
        [id]="name()"
        [type]="type()"
        [attr.autocomplete]="autocomplete()"
        [attr.autocapitalize]="isEmail() ? 'none' : null"
        [attr.spellcheck]="isEmail() ? 'false' : null"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        [formField]="field()"
      />

      @if (showError()) {
        <p class="field__error" [id]="name() + '-error'">{{ firstError() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class TextField {
  readonly field = input.required<FieldTree<string>>();
  /** Doubles as the control's `id`, so error and hint ids derive from it. */
  readonly name = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input.required<string>();
  readonly hint = input('');

  protected readonly isEmail = computed(() => this.type() === 'email');

  protected readonly showError = computed(() => {
    const state = this.field()();

    return state.touched() && state.errors().length > 0;
  });

  protected readonly firstError = computed(() => this.field()().errors()[0]?.message ?? '');

  /**
   * The ids describing this control, in reading order: hint first, then error. `null` rather than
   * `''` when there is nothing to point at — an empty `aria-describedby` is a violation of its own.
   */
  protected readonly describedBy = computed(() => {
    const ids = [
      this.hint() !== '' ? `${this.name()}-hint` : '',
      this.showError() ? `${this.name()}-error` : '',
    ].filter((id) => id !== '');

    return ids.length === 0 ? null : ids.join(' ');
  });
}
