import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { IdentityGateway } from '../../../core/identity/identity-gateway';

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {
  private readonly identity = inject(IdentityGateway);

  /**
   * `rxResource` wraps the gateway's Observable into signal state — loading, error and value — which
   * is what `orval.config.ts` prescribes for reads that want a signal, since the generated client is
   * configured for `httpClient` rather than the GET-only experimental `httpResource`.
   *
   * Note `stream:`, not `loader:`. Both `rxResource` itself and the signal-forms API this app uses
   * elsewhere are marked experimental in v21.
   */
  protected readonly profile = rxResource({ stream: () => this.identity.profile() });

  protected readonly fullName = computed(() => {
    const value = this.profile.value();

    return [value?.firstName, value?.lastName]
      .filter((part) => part !== undefined && part !== '')
      .join(' ');
  });

  /**
   * Every member of the profile response is optional in the OpenAPI contract, so `{}` is a valid
   * answer. `toUserProfile` has already turned that into empty strings; this is where the UI decides
   * what an entirely empty record means, rather than rendering four blank rows.
   */
  protected readonly hasNoDetails = computed(
    () => this.fullName() === '' && (this.profile.value()?.email ?? '') === '',
  );

  protected reload(): void {
    this.profile.reload();
  }
}
