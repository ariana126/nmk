import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Identity } from '@framework/domain';
import { AuthenticatedUser } from './authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const payload = (request as any).user as { sub: string };
    return new AuthenticatedUser(Identity.fromString(payload.sub));
  },
);
