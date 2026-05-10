import { z } from 'zod';

export interface ProductDto {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  credits: number;
  active: boolean;
  sort: number;
}

export interface OrderDto {
  id: string;
  orderNo: string;
  userId: string;
  productId?: string | null;
  productName?: string | null;
  type: string;
  amount: number;
  credits: number;
  status: string;
  createdAt: string;
  paidAt?: string | null;
}

export const createOrderSchema = z.object({
  productId: z.string().min(1),
  paymentMethod: z.enum(['mock', 'wechat', 'alipay']).default('mock'),
});
export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export const upsertProductSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(500).optional(),
  price: z.number().int().min(0),
  credits: z.number().int().min(0),
  active: z.boolean().default(true),
  sort: z.number().int().default(0),
});
export type UpsertProductDto = z.infer<typeof upsertProductSchema>;
