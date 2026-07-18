import { CommandHandlers } from '@identity/application/commands';
import { QueryHandlers } from '@identity/application/queries';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { TokenService } from '@identity/domain/service/token.service';
import { UserRepository } from '@identity/domain/service/user.repository';
import { Controllers } from '@identity/infrastructure/http/controllers';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';
import { PrismaUserRepository } from './persistence/user.repository';

@Module({
  imports: [CqrsModule],
  controllers: [...Controllers],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: PasswordHasher,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TokenService,
      useClass: JwtTokenService,
    },
  ],
  exports: [UserRepository],
})
export class IdentityModule {}
