import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { WechatService } from './wechat.service';
import { loadEnv } from '../../config/env';

const STATE_TTL_MS = 5 * 60_000;

@Controller('auth/wechat')
export class WechatController {
  private readonly logger = new Logger(WechatController.name);

  constructor(private auth: AuthService, private wechat: WechatService) {}

  @Public()
  @Get('start')
  async start(@Res() res: Response) {
    const state = this.signState({ n: randomBytes(8).toString('hex'), t: Date.now() });
    try {
      const url = this.wechat.buildAuthUrl(state);
      res.redirect(url);
    } catch (err) {
      this.logger.error(err, 'wechat start failed');
      res.redirect(this.failUrl('wechat_not_configured'));
    }
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const env = loadEnv();
    try {
      const payload = this.verifyState(state ?? '');
      if (!payload || Date.now() - Number(payload.t) > STATE_TTL_MS) {
        return res.redirect(this.failUrl('state_invalid'));
      }
      if (!code) return res.redirect(this.failUrl('missing_code'));

      const profile = await this.wechat.exchange(code);
      const tokens = await this.auth.findOrCreateWechat(profile, {
        ip: req.ip,
        ua: req.headers['user-agent'],
      });
      const hash = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: String(tokens.expiresIn),
      });
      res.redirect(`${env.WEB_BASE_URL}/login/callback#${hash.toString()}`);
    } catch (err) {
      this.logger.error(err, 'wechat callback failed');
      const msg = err instanceof Error ? err.message : 'oauth_error';
      res.redirect(this.failUrl(msg));
    }
  }

  // ---------- HMAC-signed state ----------

  private signState(payload: Record<string, string | number>): string {
    const env = loadEnv();
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mac = createHmac('sha256', env.JWT_ACCESS_SECRET).update(body).digest('base64url');
    return `${body}.${mac}`;
  }

  private verifyState(state: string): Record<string, string | number> | null {
    const env = loadEnv();
    const [body, mac] = state.split('.');
    if (!body || !mac) return null;
    const expected = createHmac('sha256', env.JWT_ACCESS_SECRET).update(body).digest('base64url');
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  private failUrl(reason: string): string {
    const env = loadEnv();
    return `${env.WEB_BASE_URL}/login?reason=${encodeURIComponent(reason)}`;
  }
}
