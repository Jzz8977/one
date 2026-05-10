import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@app/db';
import { pageOf, pageResult } from '../../common/utils/pagination';

@Injectable()
export class AdminOrdersService {
  constructor(private prisma: PrismaService) {}

  async list(query: { page?: number; pageSize?: number; status?: string; keyword?: string }) {
    const params = pageOf(query);
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { orderNo: { contains: query.keyword, mode: 'insensitive' } },
        { user: { email: { contains: query.keyword, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return pageResult(
      items.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        userId: o.userId,
        userEmail: o.user.email,
        productName: o.productName,
        amount: o.amount,
        credits: o.credits,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        paidAt: o.paidAt?.toISOString() ?? null,
      })),
      total,
      params,
    );
  }
}
