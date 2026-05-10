import { Body, Controller, Delete, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { createApiKeySchema, type CreateApiKeyDto } from '@app/shared';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private keys: ApiKeysService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.keys.list(user.id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createApiKeySchema))
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateApiKeyDto) {
    return this.keys.create(user.id, dto.name);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.keys.revoke(user.id, id);
  }
}
