import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@app/db';
import { CREDIT_TX_TYPE, type CreditTxType, API_RESPONSE_INSUFFICIENT_CREDITS } from '@app/shared';
import { pageOf, pageResult } from '../../common/utils/pagination';

export class InsufficientCreditsException extends HttpException {
  constructor(required: number, balance: number) {
    super(
      { code: API_RESPONSE_INSUFFICIENT_CREDITS, message: '积分不足', content: { required, balance } },
      API_RESPONSE_INSUFFICIENT_CREDITS,
    );
  }
}

interface ChangeOptions {
  userId: string;
  amount: number;
  type: CreditTxType;
  remark?: string;
  refType?: string;
  refId?: string;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  constructor(private prisma: PrismaService) {}

  async ensureAccount(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.creditAccount.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });
  }

  async getAccount(userId: string) {
    const acc = await this.ensureAccount(userId);
    return {
      balance: acc.balance,
      frozenBalance: acc.frozenBalance,
      updatedAt: acc.updatedAt.toISOString(),
    };
  }

  async listTransactions(userId: string, query: { page?: number; pageSize?: number; type?: string }) {
    const params = pageOf(query);
    const where: Prisma.CreditTransactionWhereInput = { userId };
    if (query.type) where.type = query.type;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.creditTransaction.count({ where }),
    ]);
    return pageResult(
      items.map((it) => ({
        id: it.id,
        type: it.type,
        amount: it.amount,
        balanceAfter: it.balanceAfter,
        remark: it.remark,
        createdAt: it.createdAt.toISOString(),
      })),
      total,
      params,
    );
  }

  /**
   * 原子性地变更积分余额并写入流水。
   * amount 正数为加，负数为扣。
   */
  async change(opts: ChangeOptions) {
    if (opts.amount === 0) throw new BadRequestException('金额不能为 0');
    const work = async (tx: Prisma.TransactionClient) => {
      const acc = await tx.creditAccount.upsert({
        where: { userId: opts.userId },
        update: {},
        create: { userId: opts.userId, balance: 0 },
      });
      const next = acc.balance + opts.amount;
      if (next < 0) {
        throw new InsufficientCreditsException(Math.abs(opts.amount), acc.balance);
      }
      const updated = await tx.creditAccount.update({
        where: { userId: opts.userId },
        data: { balance: next },
      });
      const txn = await tx.creditTransaction.create({
        data: {
          userId: opts.userId,
          type: opts.type,
          amount: opts.amount,
          balanceAfter: updated.balance,
          remark: opts.remark,
          refType: opts.refType,
          refId: opts.refId,
        },
      });
      return { account: updated, transaction: txn };
    };
    if (opts.tx) return work(opts.tx);
    return this.prisma.$transaction(work, { isolationLevel: 'Serializable' });
  }

  async freeze(userId: string, amount: number, refType?: string, refId?: string) {
    if (amount <= 0) throw new BadRequestException('冻结金额必须为正');
    return this.prisma.$transaction(async (tx) => {
      const acc = await this.ensureAccount(userId, tx);
      if (acc.balance < amount) throw new InsufficientCreditsException(amount, acc.balance);
      const updated = await tx.creditAccount.update({
        where: { userId },
        data: { balance: acc.balance - amount, frozenBalance: acc.frozenBalance + amount },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: CREDIT_TX_TYPE.FREEZE,
          amount: -amount,
          balanceAfter: updated.balance,
          remark: '冻结积分',
          refType,
          refId,
        },
      });
      return updated;
    });
  }

  async settleFrozen(userId: string, frozen: number, actualCost: number, refType?: string, refId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const acc = await this.ensureAccount(userId, tx);
      // 释放冻结
      const refundToBalance = frozen - actualCost;
      const newFrozen = Math.max(0, acc.frozenBalance - frozen);
      const newBalance = acc.balance + Math.max(0, refundToBalance);
      const updated = await tx.creditAccount.update({
        where: { userId },
        data: { balance: newBalance, frozenBalance: newFrozen },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: CREDIT_TX_TYPE.UNFREEZE,
          amount: frozen,
          balanceAfter: updated.balance,
          remark: '解冻并结算',
          refType,
          refId,
        },
      });
      if (actualCost > 0) {
        await tx.creditTransaction.create({
          data: {
            userId,
            type: CREDIT_TX_TYPE.CONSUME,
            amount: -actualCost,
            balanceAfter: updated.balance,
            remark: 'AI 调用消耗',
            refType,
            refId,
          },
        });
      }
      return updated;
    });
  }

  async adminAdjust(adminId: string, userId: string, amount: number, remark?: string) {
    return this.change({
      userId,
      amount,
      type: CREDIT_TX_TYPE.ADMIN_ADJUST,
      remark: remark ?? `管理员调整 by ${adminId}`,
      refType: 'admin',
      refId: adminId,
    });
  }
}
