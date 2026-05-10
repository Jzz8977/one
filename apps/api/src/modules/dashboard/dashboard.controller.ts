import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Permissions } from '../../common/decorators/roles.decorator';

@Controller('admin/dashboard')
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Permissions('user.read')
  @Get()
  stats() {
    return this.dashboard.stats();
  }
}
