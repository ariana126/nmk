import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { LoginUserDto } from '@identity/infrastructure/http/controllers/auth/dto/login-user.dto';
import { LoginCommand } from '@identity/application/commands/login/login.command';
import { Email } from '@framework/domain';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginUserDto): Promise<{ accessToken: string }> {
    return this.commandBus.execute(
      new LoginCommand(Email.fromString(body.email), body.password),
    );
  }
}
