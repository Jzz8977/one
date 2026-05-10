import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator((data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const user = req.user as RequestUser | undefined;
  if (!user) return null;
  return data ? user[data] : user;
});
