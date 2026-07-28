import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ACCESS_TOKEN_STORAGE_KEY } from './access-token-storage-key';
import { SessionStore } from './session-store';

describe('SessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts anonymous when nothing is stored', () => {
    const session = TestBed.inject(SessionStore);

    expect(session.isAuthenticated()).toBe(false);
    expect(session.accessToken()).toBe('');
  });

  it('hydrates from a token stored by a previous visit, so a reload keeps you logged in', () => {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'a-token-from-last-time');

    const session = TestBed.inject(SessionStore);

    expect(session.isAuthenticated()).toBe(true);
    expect(session.accessToken()).toBe('a-token-from-last-time');
  });

  it('stores a token both in memory and on disk', () => {
    const session = TestBed.inject(SessionStore);

    session.store('a-fresh-token');

    expect(session.accessToken()).toBe('a-fresh-token');
    expect(session.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('a-fresh-token');
  });

  it('clears the token from both, so a reload does not resurrect a logged-out session', () => {
    const session = TestBed.inject(SessionStore);
    session.store('a-fresh-token');

    session.clear();

    expect(session.accessToken()).toBe('');
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
