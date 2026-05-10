import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors, UsePipes } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CreditsService } from '../credits/credits.service';
import { Permissions } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { adjustCreditsSchema, updateUserStatusSchema, type AdjustCreditsDto, type UpdateUserStatusDto } from '@app/shared';
import { AdminLog, AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';

@UseInterceptors(AdminLogInterceptor)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private users: AdminUsersService, private credits: CreditsService) {}

  @Permissions('user.read')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.users.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
      status,
    });
  }

  @Permissions('user.read')
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.users.detail(id);
  }

  @Permissions('user.disable')
  @Patch(':id/status')
  @AdminLog('user.update_status')
  @UsePipes(new ZodValidationPipe(updateUserStatusSchema))
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.users.updateStatus(id, dto.status);
  }

  @Permissions('credit.adjust')
  @Post(':id/credits/adjust')
  @AdminLog('credit.adjust')
  @UsePipes(new ZodValidationPipe(adjustCreditsSchema))
  adjustCredits(
    @CurrentUser() admin: RequestUser,
    @Param('id') userId: string,
    @Body() dto: AdjustCreditsDto,
  ) {
    return this.credits.adminAdjust(admin.id, userId, dto.amount, dto.remark);
  }
}
