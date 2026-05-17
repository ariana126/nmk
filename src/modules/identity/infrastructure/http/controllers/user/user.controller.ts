import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterUserCommand } from '@identity/application/commands/register-user/register-user.command';
import { Email } from '@framework/domain';

@Controller('users')
export class UserController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterUserDto): Promise<void> {
    await this.commandBus.execute(
      new RegisterUserCommand(
        Email.fromString(body.email),
        body.password,
        body.firstName,
        body.lastName,
      ),
    );
  }
}
