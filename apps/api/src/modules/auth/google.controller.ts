import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';
import { loadEnv } from '../../config/env';

const STATE_TTL_MS = 5 * 60_000;

@Controller('auth/google')
export class GoogleController {
  private readonly logger = new Logger(GoogleController.name);

  constructor(private auth: AuthService, private google: GoogleService) {}

  @Public()
  @Get('start')
  async start(@Res() res: Response) {
    const state = this.signState({ n: randomBytes(8).toString('hex'), t: Date.now() });
    const url = await this.google.buildAuthUrl(state);
    res.redirect(url);
  }

  @Public()
  @Get('callback')
  async callback(@Query('state') state: string, @Req() req: Request, @Res() res: Response) {
    const env = loadEnv();
    try {
      const payload = this.verifyState(state ?? '');
      if (!payload || Date.now() - Number(payload.t) > STATE_TTL_MS) {
        return res.redirect(this.failUrl('state_invalid'));
      }
      const profile = await this.google.exchange(req, state);
      const tokens = await this.auth.findOrCreateGoogle(profile, {
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
      this.logger.error(err, 'google callback failed');
      const msg = err instanceof Error ? err.message : 'oauth_error';
      res.redirect(this.failUrl(msg));
    }
  }

  // ---------- HMAC-signed state (CSRF protection without cookies) ----------

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
