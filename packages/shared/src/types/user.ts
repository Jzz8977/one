import { z } from 'zod';

export interface UserSummary {
  id: string;
  email: string;
  status: string;
  nickname?: string | null;
  avatar?: string | null;
  createdAt: string;
}

export interface UserDetail extends UserSummary {
  bio?: string | null;
  phone?: string | null;
  roles: string[];
  creditBalance: number;
  updatedAt: string;
}

export const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(32).optional(),
  avatar: z.string().url().or(z.literal('')).optional(),
  bio: z.string().max(500).optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
