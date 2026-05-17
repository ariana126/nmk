import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '@identity/domain/service/token.service';

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  sign(payload: Record<string, unknown>): string {
    return this.jwtService.sign(payload);
  }
}
