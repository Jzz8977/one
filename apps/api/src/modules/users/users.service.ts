import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateProfileDto } from '@app/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException();
    return {
      nickname: profile.nickname,
      avatar: profile.avatar,
      bio: profile.bio,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { ...dto, avatar: dto.avatar ?? null },
      create: { userId, ...dto, avatar: dto.avatar ?? null },
    });
    return {
      nickname: updated.nickname,
      avatar: updated.avatar,
      bio: updated.bio,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
