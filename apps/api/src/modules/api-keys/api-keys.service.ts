import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private hash(key: string) {
    return createHash('sha256').update(key).digest('hex');
  }

  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      status: k.status,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  }

  async create(userId: string, name: string) {
    const raw = `sk-${randomBytes(24).toString('hex')}`;
    const prefix = `${raw.slice(0, 8)}...${raw.slice(-4)}`;
    const keyHash = this.hash(raw);
    const key = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, prefix, status: 'active' },
    });
    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      status: key.status,
      lastUsedAt: null,
      createdAt: key.createdAt.toISOString(),
      fullKey: raw,
    };
  }

  async revoke(userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException();
    return this.prisma.apiKey.update({ where: { id }, data: { status: 'disabled' } });
  }

  async findActiveByRaw(raw: string) {
    const keyHash = this.hash(raw);
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });
  }

  async touchLastUsed(id: string) {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}
