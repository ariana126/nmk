import { Clock } from '@framework/domain';
import { RegisterUserCommand } from '@identity/application/commands/register-user/register-user.command';
import { UserAlreadyExists } from '@identity/application/exceptions';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { UserRepository } from '@identity/domain/service/user.repository';
import { User } from '@identity/domain/user.aggregate';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterUserCommand): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw UserAlreadyExists.withEmail(command.email);
    }

    const hashedPassword = await this.passwordHasher.hash(command.password);
    const user = User.register(
      command.email,
      hashedPassword,
      command.firstName,
      command.lastName,
      this.clock.now(),
    );
    await this.userRepository.save(user);
  }
}
