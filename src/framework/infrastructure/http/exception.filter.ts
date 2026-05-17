import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import {
  FrameworkExceptionMapper,
  ProblemDetail,
} from '@framework/infrastructure';
import { ExceptionMapper } from '@framework/infrastructure';
import { IdentityExceptionMapper } from '@identity/infrastructure/http/exception.mapper';

const ExceptionMappers: ExceptionMapper[] = [
  new FrameworkExceptionMapper(),
  new IdentityExceptionMapper(),
];

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const problemDetail: ProblemDetail = this.getProblemDetail(exception);
    return response
      .status(problemDetail.status)
      .header('Content-Type', 'application/problem+json')
      .json(problemDetail.asResponseBody());
  }

  private getProblemDetail(exception: unknown): ProblemDetail {
    for (const mapper of ExceptionMappers) {
      if (!mapper.canMap(exception)) {
        continue;
      }
      return mapper.toProblemDetail(exception);
    }
    return ProblemDetail.forUnknownError();
  }
}
