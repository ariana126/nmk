import { Clock } from '@framework/domain';
import { ResetPasswordCommand } from '@identity/application/commands/reset-password/reset-password.command';
import { PasswordResetNotFound } from '@identity/application/exceptions';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { PasswordResetTokenGenerator } from '@identity/domain/service/password-reset-token-generator';
import { UserRepository } from '@identity/domain/service/user.repository';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: PasswordResetTokenGenerator,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const token = this.tokenGenerator.digest(command.secret);
    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user) {
      throw PasswordResetNotFound.forUnknownToken();
    }

    user.resetPassword(
      await this.passwordHasher.hash(command.newPassword),
      this.clock.now(),
    );
    await this.userRepository.save(user);
  }
}
