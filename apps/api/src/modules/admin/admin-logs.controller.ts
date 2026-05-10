import { Controller, Get, Query } from '@nestjs/common';
import { Permissions } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { pageOf, pageResult } from '../../common/utils/pagination';

@Controller('admin/logs')
export class AdminLogsController {
  constructor(private prisma: PrismaService) {}

  @Permissions('user.read')
  @Get()
  async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('action') action?: string) {
    const params = pageOf({ page, pageSize });
    const where = action ? { action } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.adminLog.findMany({
        where,
        include: { admin: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.adminLog.count({ where }),
    ]);
    return pageResult(
      items.map((l) => ({
        id: l.id,
        adminId: l.adminId,
        adminEmail: l.admin.email,
        action: l.action,
        target: l.target,
        payload: l.payload as unknown,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      params,
    );
  }
}
