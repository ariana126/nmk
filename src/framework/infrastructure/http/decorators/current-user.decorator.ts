import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Identity } from '@framework/domain';
import { AuthenticatedUser } from './authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const authedRequest = request as Request & { user: { sub: string } };
    const payload = authedRequest.user;
    return new AuthenticatedUser(Identity.fromString(payload.sub));
  },
);
