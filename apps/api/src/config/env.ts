import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),

  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  DEFAULT_REGISTER_CREDITS: z.coerce.number().int().default(1000),

  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  OPENAI_API_KEY: z.string().default(''),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_API_KEY: z.string().default(''),
  SILICONFLOW_BASE_URL: z.string().default('https://api.siliconflow.cn/v1'),
  SILICONFLOW_API_KEY: z.string().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('✗ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  cached = parsed.data;
  return cached;
}
