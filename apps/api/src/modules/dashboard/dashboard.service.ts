import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [userCount, newUserToday, orderCount, paidAggToday, aiCallToday, creditsAggToday] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _sum: { amount: true },
          where: { status: 'paid', paidAt: { gte: todayStart } },
        }),
        this.prisma.aiUsageLog.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.aiUsageLog.aggregate({
          _sum: { creditsCost: true },
          where: { createdAt: { gte: todayStart }, status: 'success' },
        }),
      ]);

    return {
      userCount,
      newUserToday,
      orderCount,
      paidAmountToday: paidAggToday._sum.amount ?? 0,
      aiCallToday,
      creditsConsumedToday: creditsAggToday._sum.creditsCost ?? 0,
    };
  }
}
