import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page stack">
      <p class="eyebrow">404</p>
      <h1 class="display">There is nothing at this address.</h1>
      <p class="prose">Check the link, or start again from the home page.</p>
      <div><a class="button button--quiet" routerLink="/">Go to the home page</a></div>
    </div>
  `,
  styles: `
    .page {
      max-width: var(--measure);
      margin: 0 auto;
      padding: var(--space-8) var(--space-5);
    }

    h1 {
      font-size: var(--text-2xl);
    }
  `,
})
export class NotFoundPage {}
