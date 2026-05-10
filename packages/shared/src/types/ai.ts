import { z } from 'zod';

export interface AiProviderDto {
  id: string;
  code: string;
  name: string;
  baseUrl: string;
  active: boolean;
}

export interface AiModelDto {
  id: string;
  providerId: string;
  providerCode?: string;
  code: string;
  name: string;
  inputPricePerKToken: number;
  outputPricePerKToken: number;
  active: boolean;
}

export interface AiUsageLogDto {
  id: string;
  userId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  creditsCost: number;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
}

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional(),
  stream: z.boolean().optional().default(false),
});
export type ChatRequestDto = z.infer<typeof chatRequestSchema>;

export interface ChatResponseDto {
  id: string;
  model: string;
  message: ChatMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    creditsCost: number;
  };
}

export const upsertProviderSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  active: z.boolean().default(true),
});
export type UpsertProviderDto = z.infer<typeof upsertProviderSchema>;

export const upsertModelSchema = z.object({
  providerId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  inputPricePerKToken: z.number().min(0),
  outputPricePerKToken: z.number().min(0),
  active: z.boolean().default(true),
});
export type UpsertModelDto = z.infer<typeof upsertModelSchema>;
