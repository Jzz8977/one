import { Controller, Get, Query } from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { Permissions } from '../../common/decorators/roles.decorator';

@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private orders: AdminOrdersService) {}

  @Permissions('order.read')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.orders.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      keyword,
    });
  }
}
