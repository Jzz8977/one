import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@app/db';
import { pageOf, pageResult } from '../../common/utils/pagination';

@Injectable()
export class AdminAiService {
  constructor(private prisma: PrismaService) {}

  async listLogs(query: { page?: number; pageSize?: number; status?: string; keyword?: string }) {
    const params = pageOf(query);
    const where: Prisma.AiUsageLogWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { user: { email: { contains: query.keyword, mode: 'insensitive' } } },
        { model: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.aiUsageLog.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.aiUsageLog.count({ where }),
    ]);
    return pageResult(
      items.map((it) => ({
        id: it.id,
        userId: it.userId,
        userEmail: it.user.email,
        provider: it.provider,
        model: it.model,
        promptTokens: it.promptTokens,
        completionTokens: it.completionTokens,
        totalTokens: it.totalTokens,
        creditsCost: it.creditsCost,
        status: it.status,
        errorMessage: it.errorMessage,
        durationMs: it.durationMs,
        createdAt: it.createdAt.toISOString(),
      })),
      total,
      params,
    );
  }

  async listProviders() {
    return this.prisma.aiProvider.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async listModels() {
    return this.prisma.aiModel.findMany({ include: { provider: true }, orderBy: { createdAt: 'asc' } });
  }

  async upsertProvider(data: { id?: string; code: string; name: string; baseUrl: string; apiKey?: string; active: boolean }) {
    if (data.id) {
      return this.prisma.aiProvider.update({
        where: { id: data.id },
        data: { name: data.name, baseUrl: data.baseUrl, active: data.active, code: data.code },
      });
    }
    return this.prisma.aiProvider.create({
      data: {
        code: data.code,
        name: data.name,
        baseUrl: data.baseUrl,
        active: data.active,
      },
    });
  }

  async upsertModel(data: {
    id?: string;
    providerId: string;
    code: string;
    name: string;
    inputPricePerKToken: number;
    outputPricePerKToken: number;
    active: boolean;
  }) {
    if (data.id) {
      return this.prisma.aiModel.update({ where: { id: data.id }, data });
    }
    return this.prisma.aiModel.create({ data });
  }
}
