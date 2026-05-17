import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterUserCommand } from '@identity/application/commands/register-user/register-user.command';
import { Email } from '@framework/domain';
import { GetUserByIdQuery } from '@identity/application/queries/get-user-by-id/get-user-by-id.query';
import { JwtAuthGuard } from '@identity/infrastructure/http/guards/jwt-auth.guard';
import { CurrentUser } from '@identity/infrastructure/http/decorators/current-user.decorator';
import { AuthenticatedUser } from '@identity/infrastructure/http/decorators/authenticated-user';

@Controller('users')
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async profile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ firstName: string; lastName: string; email: string }> {
    return await this.queryBus.execute(new GetUserByIdQuery(user.id));
  }
}
