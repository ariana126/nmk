import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DomainException,
  ENTITY_NOT_FOUND_ERROR_CODE,
} from '@framework/domain';
import {
  INVALID_CREDENTIALS_ERROR_CODE,
  USER_ALREADY_EXISTS_ERROR_CODE,
} from '@identity/application/exceptions';

const HTTP_STATUS_MAP: Record<string, number> = {
  [ENTITY_NOT_FOUND_ERROR_CODE]: HttpStatus.NOT_FOUND,
  [USER_ALREADY_EXISTS_ERROR_CODE]: HttpStatus.CONFLICT,
  [INVALID_CREDENTIALS_ERROR_CODE]: HttpStatus.UNAUTHORIZED,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (!(exception instanceof DomainException)) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
      return;
    }

    const statusCode =
      HTTP_STATUS_MAP[exception.errorCode] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      statusCode,
      errorCode: exception.errorCode,
      message: exception.message,
    });
  }
}
