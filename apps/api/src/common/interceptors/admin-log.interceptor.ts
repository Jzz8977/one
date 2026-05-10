import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export const ADMIN_LOG_KEY = 'adminLogAction';
export const AdminLog = (action: string) => {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(ADMIN_LOG_KEY, action, descriptor?.value ?? target);
  };
};

@Injectable()
export class AdminLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(ADMIN_LOG_KEY, ctx.getHandler());
    if (!action) return next.handle();
    const req = ctx.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const adminId = req.user?.id;
    return next.handle().pipe(
      tap({
        next: async (result) => {
          if (!adminId) return;
          try {
            await this.prisma.adminLog.create({
              data: {
                adminId,
                action,
                target: (req.params?.id as string | undefined) ?? null,
                payload: { params: req.params, body: req.body, ok: true } as never,
                ip: req.ip ?? null,
                userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
              },
            });
          } catch {
            // ignore log errors
          }
        },
      }),
    );
  }
}
