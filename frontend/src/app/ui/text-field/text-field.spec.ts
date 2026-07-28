import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, required } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';

import { TextField } from './text-field';

@Component({
  imports: [TextField],
  template: `
    <app-text-field
      [field]="f.email"
      name="email"
      label="Email address"
      type="email"
      autocomplete="email"
      [hint]="hint()"
    />
  `,
})
class Host {
  readonly hint = signal('');
  protected readonly model = signal({ email: '' });
  readonly f = form(this.model, (path) => {
    required(path.email, { message: 'Enter your email address.' });
  });
}

describe('TextField', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  function element<T extends Element>(selector: string): T | null {
    return (fixture.nativeElement as HTMLElement).querySelector<T>(selector);
  }

  function input(): HTMLInputElement {
    return element<HTMLInputElement>('input')!;
  }

  it('pairs the label with the control using the given name', () => {
    expect(element('label')?.getAttribute('for')).toBe('email');
    expect(input().id).toBe('email');
  });

  it('turns off autocorrection for an email control, where it only gets in the way', () => {
    expect(input().getAttribute('autocapitalize')).toBe('none');
    expect(input().getAttribute('spellcheck')).toBe('false');
  });

  it('describes nothing when there is no hint and no error', () => {
    // An empty aria-describedby is a violation of its own, so the attribute must be absent.
    expect(input().hasAttribute('aria-describedby')).toBe(false);
    expect(input().hasAttribute('aria-invalid')).toBe(false);
  });

  it('points at the hint as soon as it has one', async () => {
    host.hint.set('Use your work address.');
    await fixture.whenStable();

    expect(input().getAttribute('aria-describedby')).toBe('email-hint');
    expect(element('#email-hint')?.textContent).toContain('Use your work address.');
  });

  it('shows nothing until the field has been touched', async () => {
    expect(element('#email-error')).toBeNull();
  });

  it('reports the error once the field is touched, and points the control at it', async () => {
    host.f.email().markAsTouched();
    await fixture.whenStable();

    expect(element('#email-error')?.textContent).toContain('Enter your email address.');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('email-error');
  });

  it('lists the hint before the error, in the order they are read', async () => {
    host.hint.set('Use your work address.');
    host.f.email().markAsTouched();
    await fixture.whenStable();

    expect(input().getAttribute('aria-describedby')).toBe('email-hint email-error');
  });
});
