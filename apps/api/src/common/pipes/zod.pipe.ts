import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * 仅校验 @Body() 参数，避开 @CurrentUser/@Param/@Query 等同 handler 的其他参数。
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    try {
      return this.schema.parse(value);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          message: '参数校验失败',
          error: e.flatten().fieldErrors,
        });
      }
      throw e;
    }
  }
}

export function zodPipe(schema: ZodSchema) {
  return new ZodValidationPipe(schema);
}
