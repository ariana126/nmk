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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterUserCommand } from '@identity/application/commands/register-user/register-user.command';
import { GetUserByIdQuery } from '@identity/application/queries/get-user-by-id/get-user-by-id.query';
import { UserReadModel } from '@identity/application/queries/get-user-by-id/user.read-model';
import { RegisterUserDto } from './dto/register-user.dto';
import { Email } from '@framework/domain';
import {
  JwtAuthGuard,
  CurrentUser,
  AuthenticatedUser,
  ValidationErrorSchema,
  EntityNotFoundSchema,
  JwtUnauthorizedSchema,
  domainErrorSchema,
} from '@framework/infrastructure';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully' })
  @ApiBadRequestResponse({ schema: ValidationErrorSchema })
  @ApiConflictResponse({
    schema: domainErrorSchema(
      'user-already-exists',
      'User Already Exists',
      409,
      'User already exists with email john.doe@example.com',
      { email: { type: 'string', example: 'john.doe@example.com' } },
    ),
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
    schema: JwtUnauthorizedSchema,
  })
  @ApiNotFoundResponse({ schema: EntityNotFoundSchema })
  @ApiOkResponse({
    schema: {
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        email: { type: 'string', example: 'john.doe@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
      },
    },
  })
  async profile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserReadModel> {
    return await this.queryBus.execute(new GetUserByIdQuery(user.id));
  }
}
