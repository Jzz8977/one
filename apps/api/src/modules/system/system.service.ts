import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const items = await this.prisma.systemSetting.findMany();
    return Object.fromEntries(items.map((i) => [i.key, i.value]));
  }

  async getPublic() {
    const items = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'site.name',
            'site.logo',
            'auth.register_enabled',
            'payment.enabled',
            'system.maintenance',
            'ai.default_model',
          ],
        },
      },
    });
    return Object.fromEntries(items.map((i) => [i.key, i.value]));
  }

  async update(key: string, value: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async batchUpdate(items: Array<{ key: string; value: string }>) {
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.systemSetting.upsert({
          where: { key: it.key },
          update: { value: it.value },
          create: { key: it.key, value: it.value },
        }),
      ),
    );
    return { ok: true, count: items.length };
  }
}
