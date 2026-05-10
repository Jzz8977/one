import { Body, Controller, Delete, Get, Param, Patch, Post, UseInterceptors, UsePipes } from '@nestjs/common';
import { AdminProductsService } from './admin-products.service';
import { Permissions } from '../../common/decorators/roles.decorator';
import { AdminLog, AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { upsertProductSchema, type UpsertProductDto } from '@app/shared';

@UseInterceptors(AdminLogInterceptor)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private products: AdminProductsService) {}

  @Permissions('product.manage')
  @Get()
  list() {
    return this.products.list();
  }

  @Permissions('product.manage')
  @Post()
  @AdminLog('product.create')
  @UsePipes(new ZodValidationPipe(upsertProductSchema))
  create(@Body() dto: UpsertProductDto) {
    return this.products.create(dto);
  }

  @Permissions('product.manage')
  @Patch(':id')
  @AdminLog('product.update')
  @UsePipes(new ZodValidationPipe(upsertProductSchema.partial()))
  update(@Param('id') id: string, @Body() dto: Partial<UpsertProductDto>) {
    return this.products.update(id, dto);
  }

  @Permissions('product.manage')
  @Delete(':id')
  @AdminLog('product.delete')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
