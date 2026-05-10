import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth || !String(auth).startsWith('Bearer ')) {
      if (isPublic) return true;
      throw new UnauthorizedException('未登录');
    }
    const token = String(auth).slice(7);
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException('Token 无效或已过期');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('用户已被禁用');
    }
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code))),
    );
    req.user = { id: user.id, email: user.email, status: user.status, roles, permissions };
    return true;
  }
}
