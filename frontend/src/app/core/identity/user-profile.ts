import { UserControllerProfile200 } from '../../api/model';

/** The signed-in user, as the app talks about them. Four strings, always present. */
export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

/**
 * Normalises the wire shape into the domain one.
 *
 * Nothing in the OpenAPI contract marks these members `required`, so the generated model types all
 * four as `string | undefined`. Rather than push a `?? ''` into every template that touches a profile
 * — and risk the one that forgets rendering the literal text "undefined" — the app has a single
 * wire-to-domain boundary and this is it. Downstream code gets four strings and decides for itself
 * what an empty one means.
 *
 * The deeper fix belongs to the backend: mark the response members required in its Swagger
 * decorators, then `make generate-swagger` and `make sync-api-contract`. Until then, this holds.
 */
export function toUserProfile(dto: UserControllerProfile200): UserProfile {
  return {
    id: dto.id ?? '',
    email: dto.email ?? '',
    firstName: dto.firstName ?? '',
    lastName: dto.lastName ?? '',
  };
}
