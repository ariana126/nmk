import { ExceptionMapper, ProblemDetail } from '@framework/infrastructure';
import {
  InvalidCredentials,
  PasswordResetNotFound,
  UserAlreadyExists,
  UserNotFound,
} from '@identity/application/exceptions';
import { PasswordResetAlreadyUsed } from '@identity/domain/exception/password-reset-already-used.exception';
import { PasswordResetExpired } from '@identity/domain/exception/password-reset-expired.exception';
import { HttpStatus } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';

export class IdentityExceptionMapper implements ExceptionMapper {
  // Two of these are DomainException subclasses rather than ApplicationException ones:
  // redeeming a link is a domain invariant, and the invariant is what the client is told about.
  canMap(exception: unknown): boolean {
    return (
      exception instanceof UserAlreadyExists ||
      exception instanceof InvalidCredentials ||
      exception instanceof UserNotFound ||
      exception instanceof PasswordResetNotFound ||
      exception instanceof PasswordResetExpired ||
      exception instanceof PasswordResetAlreadyUsed
    );
  }

  toProblemDetail(exception: unknown): ProblemDetail {
    switch (true) {
      case exception instanceof UserAlreadyExists: {
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
      }

      case exception instanceof InvalidCredentials: {
        return new ProblemDetail(
          'invalid-credentials',
          'Invalid Credentials',
          HttpStatus.UNAUTHORIZED,
          exception.message,
        );
      }

      case exception instanceof UserNotFound: {
        return new ProblemDetail(
          'user-not-found',
          'User Not Found',
          HttpStatus.NOT_FOUND,
          exception.message,
          undefined,
          {
            email: exception.email.asString(),
          },
        );
      }

      case exception instanceof PasswordResetNotFound: {
        return new ProblemDetail(
          'password-reset-not-found',
          'Password Reset Not Found',
          HttpStatus.NOT_FOUND,
          exception.message,
        );
      }

      case exception instanceof PasswordResetExpired: {
        return new ProblemDetail(
          'password-reset-expired',
          'Password Reset Expired',
          HttpStatus.GONE,
          exception.message,
          undefined,
          {
            expiredAt: exception.expiredAt.toISOString(),
          },
        );
      }

      case exception instanceof PasswordResetAlreadyUsed: {
        return new ProblemDetail(
          'password-reset-already-used',
          'Password Reset Already Used',
          HttpStatus.GONE,
          exception.message,
          undefined,
          {
            usedAt: exception.usedAt.toISOString(),
          },
        );
      }

      default: {
        throw new RuntimeException(
          `Unexpected exception type: ${String(exception)}`,
        );
      }
    }
  }
}
