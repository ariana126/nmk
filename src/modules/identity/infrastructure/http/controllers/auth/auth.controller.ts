import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginCommand } from '@identity/application/commands/login/login.command';
import { LoginUserDto } from '@identity/infrastructure/http/controllers/auth/dto/login-user.dto';
import { Email } from '@framework/domain';
import {
  domainErrorSchema,
  ValidationErrorSchema,
} from '@framework/infrastructure';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({
    schema: { properties: { accessToken: { type: 'string' } } },
  })
  @ApiBadRequestResponse({ schema: ValidationErrorSchema })
  @ApiUnauthorizedResponse({
    schema: domainErrorSchema(
      401,
      'InvalidCredentials',
      'Invalid credentials provided.',
    ),
  })
  async login(@Body() body: LoginUserDto): Promise<{ accessToken: string }> {
    return this.commandBus.execute(
      new LoginCommand(Email.fromString(body.email), body.password),
    );
  }
}
