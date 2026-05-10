import { Body, Controller, Get, Put, UseInterceptors, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { SystemService } from './system.service';
import { Permissions } from '../../common/decorators/roles.decorator';
import { AdminLog, AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';

const batchSchema = z.object({
  items: z.array(z.object({ key: z.string().min(1), value: z.string() })).min(1),
});

@UseInterceptors(AdminLogInterceptor)
@Controller('admin/settings')
export class AdminSystemController {
  constructor(private system: SystemService) {}

  @Permissions('system.setting.manage')
  @Get()
  list() {
    return this.system.getAll();
  }

  @Permissions('system.setting.manage')
  @Put()
  @AdminLog('system.setting.update')
  @UsePipes(new ZodValidationPipe(batchSchema))
  update(@Body() dto: z.infer<typeof batchSchema>) {
    return this.system.batchUpdate(dto.items);
  }
}
