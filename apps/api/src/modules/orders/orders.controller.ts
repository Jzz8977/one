import { Body, Controller, Get, Param, Post, Query, UsePipes } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { createOrderSchema, type CreateOrderDto } from '@app/shared';

@Controller()
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Public()
  @Get('products')
  listProducts() {
    return this.orders.listProducts();
  }

  @Post('orders')
  @UsePipes(new ZodValidationPipe(createOrderSchema))
  createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user.id, dto);
  }

  @Get('orders')
  listMy(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.orders.listMyOrders(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Get('orders/:id')
  getMy(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.orders.getMyOrder(user.id, id);
  }
}
