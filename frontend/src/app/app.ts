import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { SiteHeader } from './ui/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);

  /**
   * Angular's router sets `document.title` on navigation but announces nothing and moves focus
   * nowhere. A screen-reader user is left on a page that silently became a different page, and
   * after logging out, focus sits on a button that no longer exists. Naming the new page here and
   * pulling focus to `<main>` fixes both, once, for every route.
   */
  private isFirstNavigation = true;

  /**
   * What the live region says after a navigation. Empty for the first one — the page has only just
   * loaded, and the browser already announces that.
   */
  protected readonly routeAnnouncement = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.onNavigated()),
    ),
    { initialValue: '' },
  );

  private onNavigated(): string {
    if (this.isFirstNavigation) {
      this.isFirstNavigation = false;
      return '';
    }

    document.getElementById('main-content')?.focus();

    return this.activeRouteTitle();
  }

  /**
   * The resolved title of the route just activated.
   *
   * Read from the router state rather than from `document.title`, because the built-in
   * `TitleStrategy` writes that from its own `NavigationEnd` subscriber — and this component's
   * subscriber runs first, so `document.title` is still the *previous* page's when we get here.
   * The router state is already updated by then, which makes this independent of subscriber order.
   */
  private activeRouteTitle(): string {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    while (route.firstChild !== null) {
      route = route.firstChild;
    }

    return route.title ?? '';
  }
}
