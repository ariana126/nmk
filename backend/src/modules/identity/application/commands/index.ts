import { LoginHandler } from '@identity/application/commands/login/login.handler';
import { RegisterUserHandler } from '@identity/application/commands/register-user/register-user.handler';
import { RequestPasswordResetHandler } from '@identity/application/commands/request-password-reset/request-password-reset.handler';
import { ResetPasswordHandler } from '@identity/application/commands/reset-password/reset-password.handler';

export const CommandHandlers = [
  RegisterUserHandler,
  LoginHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
];
