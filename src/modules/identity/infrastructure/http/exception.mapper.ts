import { ExceptionMapper, ProblemDetail } from '@framework/infrastructure';
import {
  InvalidCredentials,
  UserAlreadyExists,
} from '@identity/application/exceptions';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { HttpStatus } from '@nestjs/common';

export class IdentityExceptionMapper implements ExceptionMapper {
  canMap(exception: unknown): boolean {
    return (
      exception instanceof UserAlreadyExists ||
      exception instanceof InvalidCredentials
    );
  }

  toProblemDetail(exception: unknown): ProblemDetail {
    switch (true) {
      case exception instanceof UserAlreadyExists:
        return new ProblemDetail(
          'user-already-exists',
          'User Already Exists',
          HttpStatus.CONFLICT,
          exception.message,
          undefined,
          {
            email: exception.email.asString(),
          },
        );

      case exception instanceof InvalidCredentials:
        return new ProblemDetail(
          'invalid-credentials',
          'Invalid Credentials',
          HttpStatus.UNAUTHORIZED,
          exception.message,
        );

      default:
        throw new RuntimeException(
          `Unexpected exception type: ${String(exception)}`,
        );
    }
  }
}
