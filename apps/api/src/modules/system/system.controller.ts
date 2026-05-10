import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private system: SystemService) {}

  @Public()
  @Get('public-config')
  publicConfig() {
    return this.system.getPublic();
  }
}
