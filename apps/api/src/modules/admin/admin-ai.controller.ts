import { Body, Controller, Get, Post, Query, UseInterceptors, UsePipes } from '@nestjs/common';
import { AdminAiService } from './admin-ai.service';
import { Permissions } from '../../common/decorators/roles.decorator';
import { AdminLog, AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { upsertModelSchema, upsertProviderSchema, type UpsertModelDto, type UpsertProviderDto } from '@app/shared';

@UseInterceptors(AdminLogInterceptor)
@Controller('admin/ai')
export class AdminAiController {
  constructor(private ai: AdminAiService) {}

  @Permissions('ai.log.read')
  @Get('logs')
  logs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.ai.listLogs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      keyword,
    });
  }

  @Permissions('ai.provider.manage')
  @Get('providers')
  providers() {
    return this.ai.listProviders();
  }

  @Permissions('ai.provider.manage')
  @Post('providers')
  @AdminLog('ai.provider.upsert')
  @UsePipes(new ZodValidationPipe(upsertProviderSchema))
  upsertProvider(@Body() dto: UpsertProviderDto & { id?: string }) {
    return this.ai.upsertProvider(dto);
  }

  @Permissions('ai.provider.manage')
  @Get('models')
  models() {
    return this.ai.listModels();
  }

  @Permissions('ai.provider.manage')
  @Post('models')
  @AdminLog('ai.model.upsert')
  @UsePipes(new ZodValidationPipe(upsertModelSchema))
  upsertModel(@Body() dto: UpsertModelDto & { id?: string }) {
    return this.ai.upsertModel(dto);
  }
}
