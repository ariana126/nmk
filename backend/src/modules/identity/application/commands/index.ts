import { LoginHandler } from '@identity/application/commands/login/login.handler';
import { RegisterUserHandler } from '@identity/application/commands/register-user/register-user.handler';

export const CommandHandlers = [RegisterUserHandler, LoginHandler];
