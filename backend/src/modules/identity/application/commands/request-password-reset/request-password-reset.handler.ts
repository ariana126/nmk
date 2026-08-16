import { Clock } from '@framework/domain';
import { RequestPasswordResetCommand } from '@identity/application/commands/request-password-reset/request-password-reset.command';
import { UserNotFound } from '@identity/application/exceptions';
import { PasswordResetNotifier } from '@identity/domain/service/password-reset-notifier';
import { PasswordResetTokenGenerator } from '@identity/domain/service/password-reset-token-generator';
import { UserRepository } from '@identity/domain/service/user.repository';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler implements ICommandHandler<RequestPasswordResetCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: PasswordResetTokenGenerator,
    private readonly notifier: PasswordResetNotifier,
    private readonly clock: Clock,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw UserNotFound.withEmail(command.email);
    }

    const secret = this.tokenGenerator.generateSecret();
    user.requestPasswordReset(
      this.tokenGenerator.digest(secret),
      this.clock.now(),
    );
    await this.userRepository.save(user);

    await this.notifier.notify(command.email, secret);
  }
}
