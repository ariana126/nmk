import { RegisterUserHandler } from '@identity/application/commands/register-user/register-user.handler';
import { LoginHandler } from '@identity/application/commands/login/login.handler';

export const CommandHandlers = [RegisterUserHandler, LoginHandler];
