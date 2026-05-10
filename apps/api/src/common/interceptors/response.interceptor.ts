import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // 已经是统一格式则直接返回
        if (data && typeof data === 'object' && 'code' in (data as object) && 'content' in (data as object)) {
          return data;
        }
        return { code: 200, message: 'success', content: data ?? null };
      }),
    );
  }
}
