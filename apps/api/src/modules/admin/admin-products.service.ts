import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminProductsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return this.prisma.product.findMany({ orderBy: { sort: 'asc' } });
  }

  async create(data: {
    name: string;
    description?: string;
    price: number;
    credits: number;
    active: boolean;
    sort: number;
  }) {
    return this.prisma.product.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; price: number; credits: number; active: boolean; sort: number }>,
  ) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException();
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }
}
