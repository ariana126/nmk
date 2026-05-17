import { Module } from '@nestjs/common';
import { UserRepository } from '@identity/domain/service/user.repository';
import { PrismaUserRepository } from './persistence/user.repository';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { TokenService } from '@identity/domain/service/token.service';
import { JwtTokenService } from './jwt-token.service';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommandHandlers } from '@identity/application/commands';
import { Controllers } from '@identity/infrastructure/http/controllers';
import { QueryHandlers } from '@identity/application/queries';
import { JwtAuthGuard } from '@identity/infrastructure/http/guards/jwt-auth.guard';

@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [...Controllers],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    JwtAuthGuard,
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
