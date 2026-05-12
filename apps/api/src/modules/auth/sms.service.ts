import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { loadEnv } from '../../config/env';

interface CodeRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const MAX_ATTEMPTS = 5;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly store = new Map<string, CodeRecord>();

  async sendCode(phone: string) {
    const env = loadEnv();
    const now = Date.now();
    const existing = this.store.get(phone);
    if (existing && now - existing.lastSentAt < env.SMS_SEND_COOLDOWN_SECONDS * 1000) {
      const wait = Math.ceil((env.SMS_SEND_COOLDOWN_SECONDS * 1000 - (now - existing.lastSentAt)) / 1000);
      throw new BadRequestException(`请求过于频繁，请 ${wait} 秒后再试`);
    }
    const code = this.generateCode(env.SMS_CODE_LENGTH);
    this.store.set(phone, {
      code,
      expiresAt: now + env.SMS_CODE_TTL_SECONDS * 1000,
      attempts: 0,
      lastSentAt: now,
    });
    await this.dispatch(phone, code);
    this.prune();
    return { ok: true, ttl: env.SMS_CODE_TTL_SECONDS };
  }

  /** 校验并消费验证码：成功后立即删除，防重放 */
  verifyAndConsume(phone: string, code: string) {
    const rec = this.store.get(phone);
    if (!rec) throw new BadRequestException('请先获取验证码');
    if (rec.expiresAt < Date.now()) {
      this.store.delete(phone);
      throw new BadRequestException('验证码已过期');
    }
    if (rec.attempts >= MAX_ATTEMPTS) {
      this.store.delete(phone);
      throw new BadRequestException('验证次数过多，请重新获取');
    }
    if (rec.code !== code) {
      rec.attempts += 1;
      throw new BadRequestException('验证码错误');
    }
    this.store.delete(phone);
  }

  private generateCode(len: number): string {
    const max = 10 ** len;
    return String(randomInt(0, max)).padStart(len, '0');
  }

  private async dispatch(phone: string, code: string) {
    const env = loadEnv();
    switch (env.SMS_PROVIDER) {
      case 'dev':
        this.logger.warn(`[SMS dev] phone=${phone} code=${code} (生产环境请切换 SMS_PROVIDER)`);
        return;
      case 'aliyun':
      case 'tencent':
        // 真实实现：调用对应厂商 SDK / OpenAPI 发送。模板里留作接入点。
        throw new Error(`SMS_PROVIDER=${env.SMS_PROVIDER} 尚未接入，请在 sms.service.ts::dispatch 中实现`);
    }
  }

  /** 简单清理过期项，避免内存无限增长 */
  private prune() {
    if (this.store.size < 1000) return;
    const now = Date.now();
    for (const [phone, rec] of this.store) {
      if (rec.expiresAt < now) this.store.delete(phone);
    }
  }
}
