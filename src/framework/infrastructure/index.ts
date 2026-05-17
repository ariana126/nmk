export { AuthModule } from './http/auth.module';
export { PrismaModule } from './persistence/prisma.module';
export { PrismaService } from './persistence/prisma.service';
export { PrismaEntityRepository } from './persistence/prisma.repository';
export type { ExceptionMapper } from './http/exception-mapper.interface';
export { ProblemDetail } from './http/problem-detail';
export { FrameworkExceptionMapper } from './http/exception.mapper';
export { HttpExceptionFilter } from './http/exception.filter';
export { JwtAuthGuard } from './http/jwt-auth.guard';
export { AuthenticatedUser } from './http/decorators/authenticated-user';
export { CurrentUser } from './http/decorators/current-user.decorator';
export {
  ValidationErrorSchema,
  EntityNotFoundSchema,
  JwtUnauthorizedSchema,
  domainErrorSchema,
} from './http/swagger/error-schemas';
