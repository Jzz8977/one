import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
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
