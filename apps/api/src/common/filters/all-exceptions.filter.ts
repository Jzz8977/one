import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@app/db';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let detail: unknown = undefined;

    if (exception instanceof ZodError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = '参数校验失败';
      detail = exception.flatten().fieldErrors;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') message = r;
      else if (typeof r === 'object' && r !== null) {
        const anyR = r as Record<string, unknown>;
        message = (anyR.message as string) ?? exception.message;
        if (Array.isArray(anyR.message)) message = (anyR.message as string[]).join('; ');
        detail = anyR.error ?? anyR.errors ?? undefined;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = '记录已存在';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = '记录不存在';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} -> ${status} ${message}`, (exception as Error)?.stack);
    }

    res.status(status).json({
      code: status,
      message,
      content: detail ?? null,
    });
  }
}
