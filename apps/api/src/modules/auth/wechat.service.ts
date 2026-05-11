import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { loadEnv } from '../../config/env';

export interface WechatProfile {
  /** 用作本地 wechatUnionId 的稳定标识。优先 unionid，缺失时回落 openid。 */
  uid: string;
  openid: string;
  unionid: string | null;
  nickname: string | null;
  avatar: string | null;
  raw: unknown;
}

/**
 * WeChat 错误以 200 OK + { errcode, errmsg } 形式返回，axios 不会抛错，必须显式判断。
 */
class WechatError extends Error {
  constructor(public errcode: number, errmsg: string) {
    super(`wechat error ${errcode}: ${errmsg}`);
  }
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  /**
   * 生成扫码授权页 URL。
   * 文档：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
   */
  buildAuthUrl(state: string): string {
    const env = loadEnv();
    if (!env.WECHAT_OPEN_APP_ID) {
      throw new Error('WeChat OAuth not configured (WECHAT_OPEN_APP_ID empty)');
    }
    const params = new URLSearchParams({
      appid: env.WECHAT_OPEN_APP_ID,
      redirect_uri: env.WECHAT_OPEN_REDIRECT_URI,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    });
    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  }

  async exchange(code: string): Promise<WechatProfile> {
    const env = loadEnv();
    if (!env.WECHAT_OPEN_APP_ID || !env.WECHAT_OPEN_APP_SECRET) {
      throw new Error('WeChat OAuth not configured');
    }

    // Step 1: code → access_token + openid + unionid
    const tokenResp = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: env.WECHAT_OPEN_APP_ID,
        secret: env.WECHAT_OPEN_APP_SECRET,
        code,
        grant_type: 'authorization_code',
      },
      timeout: 15_000,
    });
    if (tokenResp.data.errcode) {
      throw new WechatError(tokenResp.data.errcode, tokenResp.data.errmsg);
    }
    const accessToken: string = tokenResp.data.access_token;
    const openid: string = tokenResp.data.openid;
    const unionid: string | undefined = tokenResp.data.unionid;

    // Step 2: access_token + openid → userinfo (nickname / avatar)
    const userResp = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: { access_token: accessToken, openid, lang: 'zh_CN' },
      timeout: 15_000,
    });
    if (userResp.data.errcode) {
      throw new WechatError(userResp.data.errcode, userResp.data.errmsg);
    }
    const u = userResp.data as { nickname?: string; headimgurl?: string };

    this.logger.log(`wechat exchange ok: openid=${openid} unionid=${unionid ?? '<none>'}`);
    return {
      uid: unionid || openid, // 优先 unionid
      openid,
      unionid: unionid ?? null,
      nickname: typeof u.nickname === 'string' ? u.nickname : null,
      avatar: typeof u.headimgurl === 'string' ? u.headimgurl : null,
      raw: userResp.data,
    };
  }
}
