import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { authGuard } from './auth-guard';
import { SessionStore } from './session-store';

/** Runs the guard the way the router would, in an injection context. */
function runGuard(url: string): boolean | UrlTree {
  const route = new ActivatedRouteSnapshot();
  const state = { url } as RouterStateSnapshot;

  return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
}

describe('authGuard', () => {
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  it('lets an authenticated visitor through', () => {
    session.store('a-valid-token');

    expect(runGuard('/profile')).toBe(true);
  });

  it('redirects an anonymous visitor to log in, remembering where they were headed', () => {
    const result = runGuard('/profile');

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fprofile');
  });

  it('redirects once the session has been cleared', () => {
    session.store('a-valid-token');
    session.clear();

    expect(runGuard('/profile')).toBeInstanceOf(UrlTree);
  });
});
