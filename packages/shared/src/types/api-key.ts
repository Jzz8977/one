import { z } from 'zod';

export interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  status: string;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface ApiKeyCreateResultDto extends ApiKeyDto {
  fullKey: string;
}

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
});
export type CreateApiKeyDto = z.infer<typeof createApiKeySchema>;
