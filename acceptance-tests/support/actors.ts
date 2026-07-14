import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';
import { AccountNotes } from '../screenplay/common/notes';

export class Actors implements Cast {
  constructor(private readonly apiBaseUrl: string) {}

  /**
   * Every actor gets their own notepad, so what Ariana signed up with can't leak into
   * what Fateme signed up with. A fresh cast is engaged per scenario (support/hooks.ts),
   * so the notepads reset with it.
   */
  prepare(actor: Actor): Actor {
    return actor.whoCan(
      CallAnApi.at(this.apiBaseUrl),
      TakeNotes.usingAnEmptyNotepad<AccountNotes>(),
    );
  }
}
