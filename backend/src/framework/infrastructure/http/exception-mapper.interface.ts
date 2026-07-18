import { ProblemDetail } from './problem-detail';

export interface ExceptionMapper {
  canMap(exception: unknown): boolean;
  toProblemDetail(exception: unknown): ProblemDetail;
}
