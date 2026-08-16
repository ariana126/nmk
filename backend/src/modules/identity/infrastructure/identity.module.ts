import { EmailSender } from '@framework/application';
import { CommandHandlers } from '@identity/application/commands';
import { QueryHandlers } from '@identity/application/queries';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { PasswordResetNotifier } from '@identity/domain/service/password-reset-notifier';
import { PasswordResetTokenGenerator } from '@identity/domain/service/password-reset-token-generator';
import { TokenService } from '@identity/domain/service/token.service';
import { UserRepository } from '@identity/domain/service/user.repository';
import { Controllers } from '@identity/infrastructure/http/controllers';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { EmailPasswordResetNotifier } from './email-password-reset-notifier';
import { JwtTokenService } from './jwt-token.service';
import { PrismaUserRepository } from './persistence/user.repository';
import { Sha256PasswordResetTokenGenerator } from './sha256-password-reset-token-generator';

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
    {
      provide: PasswordResetTokenGenerator,
      useClass: Sha256PasswordResetTokenGenerator,
    },
    // The notifier takes the base URL as a plain value rather than a ConfigService, so the
    // environment is read here, once, and the adapter stays a unit that can be tested directly.
    {
      provide: PasswordResetNotifier,
      inject: [EmailSender, ConfigService],
      useFactory: (emailSender: EmailSender, config: ConfigService) =>
        new EmailPasswordResetNotifier(
          emailSender,
          config.getOrThrow<string>('APP_BASE_URL'),
        ),
    },
  ],
  exports: [UserRepository],
})
export class IdentityModule {}
