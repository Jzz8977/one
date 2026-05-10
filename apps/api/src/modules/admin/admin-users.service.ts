import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@app/db';
import { pageOf, pageResult } from '../../common/utils/pagination';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async list(query: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    const params = pageOf(query);
    const where: Prisma.UserWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { email: { contains: query.keyword, mode: 'insensitive' } },
        { profile: { is: { nickname: { contains: query.keyword, mode: 'insensitive' } } } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { profile: true, creditAccount: true },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return pageResult(
      items.map((u) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        nickname: u.profile?.nickname ?? null,
        avatar: u.profile?.avatar ?? null,
        creditBalance: u.creditAccount?.balance ?? 0,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      params,
    );
  }

  async detail(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        creditAccount: true,
        roles: { include: { role: true } },
      },
    });
    if (!u) throw new NotFoundException();
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      status: u.status,
      nickname: u.profile?.nickname ?? null,
      avatar: u.profile?.avatar ?? null,
      bio: u.profile?.bio ?? null,
      creditBalance: u.creditAccount?.balance ?? 0,
      roles: u.roles.map((r) => r.role.name),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    };
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }
}
