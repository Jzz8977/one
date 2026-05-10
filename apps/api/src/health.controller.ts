import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    let db = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, time: new Date().toISOString() };
  }

  @Public()
  @Get('version')
  version() {
    return { name: 'ai-saas-starter', version: '0.1.0' };
  }
}
