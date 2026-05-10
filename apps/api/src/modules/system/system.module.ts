import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { AdminSystemController } from './admin-system.controller';
import { SystemService } from './system.service';

@Module({
  controllers: [SystemController, AdminSystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
