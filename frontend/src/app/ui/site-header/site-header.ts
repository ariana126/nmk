import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IdentityGateway } from '../../core/identity/identity-gateway';
import { SessionStore } from '../../core/identity/session-store';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <nav aria-label="Main">
        <a class="brand" routerLink="/">nmk<span aria-hidden="true">/</span></a>

        <div class="actions">
          @if (isAuthenticated()) {
            <a class="button button--quiet" routerLink="/profile">Profile</a>
            <button class="button button--quiet" type="button" (click)="logOut()">Log out</button>
          } @else {
            <a class="button button--quiet" routerLink="/login">Log in</a>
            <a class="button button--primary" routerLink="/sign-up">Create an account</a>
          }
        </div>
      </nav>
    </header>
  `,
  styles: `
    header {
      border-bottom: 1px solid var(--rule);
      background-color: var(--sheet);
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      max-width: 68rem;
      margin: 0 auto;
      padding: var(--space-4) var(--space-5);
    }

    .brand {
      font-family: var(--font-mono);
      font-size: var(--text-lg);
      font-weight: 700;
      letter-spacing: var(--tracking-tight);
      color: var(--ink);
      text-decoration: none;
    }

    /* The slash is the wordmark's whole gesture: a path segment, the vocabulary of this project. */
    .brand span {
      color: var(--indigo);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
  `,
})
export class SiteHeader {
  private readonly session = inject(SessionStore);
  private readonly identity = inject(IdentityGateway);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.session.isAuthenticated;

  protected logOut(): void {
    this.identity.logOut();
    // Home rather than /login: logging out is not a request to log back in. The shell's route
    // announcer is what catches the focus this button drops as it unmounts.
    void this.router.navigateByUrl('/');
  }
}
