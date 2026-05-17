export abstract class TokenService {
  abstract sign(payload: Record<string, unknown>): string;
}
