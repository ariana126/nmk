import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { CallAnApi } from '@serenity-js/rest';
import * as playwright from 'playwright';
import { AccountNotes } from '../screenplay/common/notes';

export class Actors implements Cast {
  constructor(
    private readonly apiBaseUrl: string,
    private readonly appBaseUrl: string,
    private readonly browser: playwright.Browser,
  ) {}

  /**
   * Every actor can reach the system through either door — the API or the browser — and picks per
   * task. That is what makes blended testing possible: `SignUp.using` and `SignUp.viaApiUsing`
   * are available to the same actor, and the scenario decides.
   *
   * Each actor gets **their own** browser ability, so each gets their own browser context and
   * therefore their own `localStorage`. Without that, Fateme would inherit whatever session
   * Ariana left behind. Their notepads are separate for the same reason; a fresh cast is engaged
   * per scenario (support/hooks.ts), so both reset with it.
   */
  prepare(actor: Actor): Actor {
    return actor.whoCan(
      CallAnApi.at(this.apiBaseUrl),
      BrowseTheWebWithPlaywright.using(this.browser, {
        baseURL: this.appBaseUrl,
      }),
      TakeNotes.usingAnEmptyNotepad<AccountNotes>(),
    );
  }
}
