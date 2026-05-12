import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .max(64, '密码最多 64 位')
  .regex(/[A-Za-z]/, '密码需包含字母')
  .regex(/[0-9]/, '密码需包含数字');

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: passwordSchema,
  nickname: z.string().min(1).max(32).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确');

export const sendSmsCodeSchema = z.object({
  phone: phoneSchema,
});
export type SendSmsCodeDto = z.infer<typeof sendSmsCodeSchema>;

export const smsLoginSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{4,8}$/, '验证码格式不正确'),
});
export type SmsLoginDto = z.infer<typeof smsLoginSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  nickname?: string | null;
  avatar?: string | null;
  status: string;
  roles: string[];
  permissions: string[];
}
