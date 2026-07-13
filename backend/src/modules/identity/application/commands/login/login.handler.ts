import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LoginCommand } from '@identity/application/commands/login/login.command';
import { UserRepository } from '@identity/domain/service/user.repository';
import { PasswordHasher } from '@identity/domain/service/password-hasher';
import { TokenService } from '@identity/domain/service/token.service';
import { InvalidCredentials } from '@identity/application/exceptions';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: LoginCommand): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findByEmail(command.email);

    if (!user) {
      throw InvalidCredentials.provided();
    }

    const passwordMatch = await this.passwordHasher.compare(
      command.password,
      user.getPassword(),
    );

    if (!passwordMatch) {
      throw InvalidCredentials.provided();
    }

    const accessToken = this.tokenService.sign({ sub: user.id.asString() });

    return { accessToken };
  }
}
