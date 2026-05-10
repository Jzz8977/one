import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminAiController } from './admin-ai.controller';
import { AdminLogsController } from './admin-logs.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminOrdersService } from './admin-orders.service';
import { AdminAiService } from './admin-ai.service';
import { AdminProductsService } from './admin-products.service';
import { AdminLogInterceptor } from '../../common/interceptors/admin-log.interceptor';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [
    AdminUsersController,
    AdminProductsController,
    AdminOrdersController,
    AdminAiController,
    AdminLogsController,
  ],
  providers: [
    AdminUsersService,
    AdminOrdersService,
    AdminAiService,
    AdminProductsService,
    AdminLogInterceptor,
  ],
})
export class AdminModule {}
