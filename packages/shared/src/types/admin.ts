import { z } from 'zod';

export interface DashboardStatsDto {
  userCount: number;
  newUserToday: number;
  orderCount: number;
  paidAmountToday: number;
  aiCallToday: number;
  creditsConsumedToday: number;
}

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'pending']),
});
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});
export type UpdateSettingDto = z.infer<typeof updateSettingSchema>;

export interface AdminLogDto {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  target?: string | null;
  payload?: unknown;
  ip?: string | null;
  createdAt: string;
}
