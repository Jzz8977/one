import { z } from 'zod';

export interface CreditAccountDto {
  balance: number;
  frozenBalance: number;
  updatedAt: string;
}

export interface CreditTransactionDto {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  remark?: string | null;
  createdAt: string;
}

export const adjustCreditsSchema = z.object({
  amount: z.number().int().refine((v) => v !== 0, '金额不能为 0'),
  remark: z.string().max(200).optional(),
});
export type AdjustCreditsDto = z.infer<typeof adjustCreditsSchema>;
