import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${req.method} ${req.originalUrl} ${Date.now() - start}ms`),
        error: (e) =>
          this.logger.warn(`${req.method} ${req.originalUrl} ${Date.now() - start}ms ERR ${e?.message ?? e}`),
      }),
    );
  }
}
