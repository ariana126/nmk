import { ProblemDetail } from '@framework/infrastructure';

export interface ExceptionMapper {
  canMap(exception: unknown): boolean;
  toProblemDetail(exception: unknown): ProblemDetail;
}
