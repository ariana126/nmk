import { AuthController } from '@identity/infrastructure/http/controllers/auth/auth.controller';
import { PasswordResetController } from '@identity/infrastructure/http/controllers/password-reset/password-reset.controller';
import { UserController } from '@identity/infrastructure/http/controllers/user/user.controller';

export const Controllers = [
  UserController,
  AuthController,
  PasswordResetController,
];
