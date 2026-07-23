import { Clock } from '@framework/domain';
import { TokenService } from '@identity/domain/service/token.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly clock: Clock,
  ) {
    super();
  }

  sign(payload: Record<string, unknown>): string {
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    return this.jwtService.sign({ ...payload, iat });
  }
}
