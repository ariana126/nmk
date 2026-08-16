import { Email } from '@framework/domain';
import {
  domainErrorSchema,
  ValidationErrorSchema,
} from '@framework/infrastructure';
import { RequestPasswordResetCommand } from '@identity/application/commands/request-password-reset/request-password-reset.command';
import { ResetPasswordCommand } from '@identity/application/commands/reset-password/reset-password.command';
import { RequestPasswordResetDto } from '@identity/infrastructure/http/controllers/password-reset/dto/request-password-reset.dto';
import { ResetPasswordDto } from '@identity/infrastructure/http/controllers/password-reset/dto/reset-password.dto';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Password Resets')
@Controller('password-resets')
export class PasswordResetController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ask for a password reset link by email' })
  @ApiCreatedResponse({ description: 'Reset link sent' })
  @ApiBadRequestResponse({ schema: ValidationErrorSchema })
  @ApiNotFoundResponse({
    schema: domainErrorSchema(
      'user-not-found',
      'User Not Found',
      404,
      'No user found with email john.doe@example.com',
      { email: { type: 'string', example: 'john.doe@example.com' } },
    ),
  })
  async request(@Body() body: RequestPasswordResetDto): Promise<void> {
    await this.commandBus.execute(
      new RequestPasswordResetCommand(Email.fromString(body.email)),
    );
  }

  @Put(':token/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Choose a new password using a reset link' })
  @ApiParam({
    name: 'token',
    description: 'The secret carried by the reset link',
  })
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({ schema: ValidationErrorSchema })
  @ApiNotFoundResponse({
    schema: domainErrorSchema(
      'password-reset-not-found',
      'Password Reset Not Found',
      404,
      'No password reset matches the link that was used',
    ),
  })
  @ApiGoneResponse({
    schema: domainErrorSchema(
      'password-reset-expired',
      'Password Reset Expired',
      410,
      'Password reset link expired at 2026-01-01T11:00:00.000Z',
      { expiredAt: { type: 'string', example: '2026-01-01T11:00:00.000Z' } },
    ),
  })
  async reset(
    @Param('token') token: string,
    @Body() body: ResetPasswordDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ResetPasswordCommand(token, body.password),
    );
  }
}
