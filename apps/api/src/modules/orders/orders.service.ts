import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { ORDER_STATUS, PAYMENT_STATUS, CREDIT_TX_TYPE, type CreateOrderDto } from '@app/shared';
import { generateOrderNo } from '../../common/utils/order-no';
import { pageOf, pageResult } from '../../common/utils/pagination';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private credits: CreditsService) {}

  async listProducts() {
    const items = await this.prisma.product.findMany({
      where: { active: true },
      orderBy: { sort: 'asc' },
    });
    return items.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      credits: p.credits,
      active: p.active,
      sort: p.sort,
    }));
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || !product.active) throw new NotFoundException('套餐不存在或已下架');

    const order = await this.prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        userId,
        productId: product.id,
        productName: product.name,
        type: 'recharge',
        amount: product.price,
        credits: product.credits,
        status: ORDER_STATUS.PENDING,
        metadata: { paymentMethod: dto.paymentMethod },
      },
    });
    await this.prisma.paymentRecord.create({
      data: {
        orderId: order.id,
        userId,
        method: dto.paymentMethod,
        status: PAYMENT_STATUS.CREATED,
        amount: order.amount,
      },
    });
    return this.toDto(order);
  }

  async listMyOrders(userId: string, query: { page?: number; pageSize?: number; status?: string }) {
    const params = pageOf(query);
    const where = { userId, ...(query.status ? { status: query.status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return pageResult(items.map((o) => this.toDto(o)), total, params);
  }

  async getMyOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException();
    return this.toDto(order);
  }

  /**
   * 标记订单已支付（幂等）。无论 mock 还是真实 notify 最终都进这里。
   */
  async markPaid(opts: { orderId?: string; orderNo?: string; outTradeNo?: string; method: string; rawNotify?: unknown }) {
    return this.prisma.$transaction(async (tx) => {
      const where = opts.orderId
        ? { id: opts.orderId }
        : opts.orderNo
        ? { orderNo: opts.orderNo }
        : null;
      if (!where) throw new BadRequestException('缺少订单标识');
      const order = await tx.order.findUnique({ where });
      if (!order) throw new NotFoundException('订单不存在');

      // 幂等：已支付直接返回
      if (order.status === ORDER_STATUS.PAID) {
        return { ok: true, idempotent: true, orderId: order.id };
      }
      if (order.status !== ORDER_STATUS.PENDING) {
        throw new BadRequestException(`订单状态 ${order.status} 不可支付`);
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: ORDER_STATUS.PAID, paidAt: new Date() },
      });

      await tx.paymentRecord.updateMany({
        where: { orderId: order.id, method: opts.method, status: PAYMENT_STATUS.CREATED },
        data: {
          status: PAYMENT_STATUS.SUCCESS,
          outTradeNo: opts.outTradeNo,
          rawNotify: (opts.rawNotify ?? undefined) as never,
          paidAt: new Date(),
        },
      });

      // 加积分（同一事务）
      await this.credits.change({
        userId: order.userId,
        amount: order.credits,
        type: CREDIT_TX_TYPE.RECHARGE,
        remark: `订单 ${order.orderNo} 充值`,
        refType: 'order',
        refId: order.id,
        tx,
      });

      return { ok: true, orderId: updated.id };
    });
  }

  toDto(o: {
    id: string;
    orderNo: string;
    userId: string;
    productId: string | null;
    productName: string | null;
    type: string;
    amount: number;
    credits: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
  }) {
    return {
      id: o.id,
      orderNo: o.orderNo,
      userId: o.userId,
      productId: o.productId,
      productName: o.productName,
      type: o.type,
      amount: o.amount,
      credits: o.credits,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    };
  }
}
