import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length && !requiredPerms?.length) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('未登录');

    if (requiredRoles?.length) {
      const ok = requiredRoles.some((r) => user.roles.includes(r));
      if (!ok) throw new ForbiddenException('角色权限不足');
    }
    if (requiredPerms?.length) {
      // super_admin 视为拥有所有权限
      if (user.roles.includes('super_admin')) return true;
      const ok = requiredPerms.every((p) => user.permissions.includes(p));
      if (!ok) throw new ForbiddenException('权限不足');
    }
    return true;
  }
}
