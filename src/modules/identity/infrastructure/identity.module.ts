import { Module } from '@nestjs/common';
import { UserRepository } from '@identity/domain/service/user.repository';
import { PrismaUserRepository } from './persistence/user.repository';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { TokenService } from '@identity/domain/service/token.service';
import { JwtTokenService } from './jwt-token.service';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from '@identity/application/commands';
import { Controllers } from '@identity/infrastructure/http/controllers';
import { QueryHandlers } from '@identity/application/queries';

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
