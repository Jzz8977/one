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

  // ===== WeChat Pay v3 =====
  WECHAT_APP_ID: z.string().default(''),
  WECHAT_MCH_ID: z.string().default(''),
  /**
   * Authorization 头的 serial_no 字段值。
   * - 证书模式：填证书序列号（openssl x509 -in apiclient_cert.pem -noout -serial）
   * - 新公钥模式：填 PUB_KEY_ID_xxx
   */
  WECHAT_PUB_KEY_ID: z.string().default(''),
  /** 商户私钥 PEM 文件路径（apiclient_key.pem） */
  WECHAT_PRIVATE_KEY_PATH: z.string().default(''),
  /** 微信平台公钥 PEM 文件路径（wechatpay_pub_key.pem，用于验签微信响应/通知） */
  WECHAT_PLATFORM_PUB_KEY_PATH: z.string().default(''),
  /** APIv3 密钥（32 字符），用于 AES-GCM 解密回调 resource */
  WECHAT_API_V3_KEY: z.string().default(''),
  /** 公网回调地址，必须 HTTPS。例：https://xxx.ngrok-free.app/api/payments/wechat/notify */
  WECHAT_NOTIFY_URL: z.string().default(''),

  // ===== Google OAuth =====
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:4000/api/auth/google/callback'),
  /** 前端基地址，第三方登录完成后跳回来落地的页面 */
  WEB_BASE_URL: z.string().default('http://localhost:5173'),

  // ===== WeChat 开放平台（PC 扫码登录）=====
  WECHAT_OPEN_APP_ID: z.string().default(''),
  WECHAT_OPEN_APP_SECRET: z.string().default(''),
  /**
   * 微信扫码完成后的回调地址。
   * - 域名部分必须等于微信开放平台后台填的"授权回调域名"
   * - 不能是 localhost / IP；本地测试用 ngrok 之类的隧道
   * 示例：https://your-domain.com/api/auth/wechat/callback
   */
  WECHAT_OPEN_REDIRECT_URI: z.string().default('http://localhost:4000/api/auth/wechat/callback'),
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
