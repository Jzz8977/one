import type { IncomingMessage } from 'node:http';
import { Injectable, Logger } from '@nestjs/common';
import { custom, Issuer, type BaseClient } from 'openid-client';
import { loadEnv } from '../../config/env';

// openid-client 默认 3.5s 超时，对国内访问 Google 太短。
custom.setHttpOptionsDefaults({ timeout: 15_000 });

// Google 的标准端点直接硬编码，避免每次启动都打一次 discovery（accounts.google.com/.well-known/...）。
// 这些 URL 是稳定的，可以放心写死。
const GOOGLE_ISSUER = new Issuer({
  issuer: 'https://accounts.google.com',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_endpoint: 'https://oauth2.googleapis.com/token',
  userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
  jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
  revocation_endpoint: 'https://oauth2.googleapis.com/revoke',
});

export interface GoogleProfile {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private client: BaseClient | null = null;

  private getClient(): BaseClient {
    if (this.client) return this.client;
    const env = loadEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
    }
    this.client = new GOOGLE_ISSUER.Client({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [env.GOOGLE_REDIRECT_URI],
      response_types: ['code'],
    });
    this.logger.log('Google OIDC client initialized (issuer hardcoded, no discovery)');
    return this.client;
  }

  async buildAuthUrl(state: string): Promise<string> {
    const client = this.getClient();
    return client.authorizationUrl({
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
  }

  async exchange(req: IncomingMessage, state: string): Promise<GoogleProfile> {
    const env = loadEnv();
    const client = this.getClient();
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(env.GOOGLE_REDIRECT_URI, params, { state });
    const claims = tokenSet.claims();
    return {
      sub: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : null,
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === 'string' ? claims.name : null,
      picture: typeof claims.picture === 'string' ? claims.picture : null,
    };
  }
}
