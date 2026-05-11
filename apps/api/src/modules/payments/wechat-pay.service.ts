import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  KeyObject,
  randomBytes,
} from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { loadEnv } from '../../config/env';

const WECHAT_BASE = 'https://api.mch.weixin.qq.com';

/** 查找仓库根（含 pnpm-workspace.yaml 的目录），用于解析相对路径 */
function findRepoRoot(start: string = __dirname): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** 相对路径基于 仓库根 解析；绝对路径原样返回 */
function resolvePemPath(p: string): string {
  if (!p) return p;
  if (isAbsolute(p)) return p;
  return resolve(findRepoRoot(), p);
}

export interface NativeOrderInput {
  outTradeNo: string;
  description: string;
  /** 单位：分 */
  totalFen: number;
  attach?: string;
}

export interface DecryptedNotifyResource {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  trade_state_desc?: string;
  amount?: { total: number; payer_total?: number };
  payer?: { openid: string };
  success_time?: string;
  attach?: string;
  [k: string]: unknown;
}

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private privateKey: KeyObject | null = null;
  private platformPubKey: KeyObject | null = null;

  private get env() {
    return loadEnv();
  }

  enabled(): boolean {
    const e = this.env;
    return Boolean(
      e.WECHAT_APP_ID &&
        e.WECHAT_MCH_ID &&
        e.WECHAT_PUB_KEY_ID &&
        e.WECHAT_PRIVATE_KEY_PATH &&
        e.WECHAT_NOTIFY_URL,
    );
  }

  /** 缺什么直接告诉调用方 */
  diagnose(): { ok: boolean; missing: string[] } {
    const e = this.env;
    const missing: string[] = [];
    if (!e.WECHAT_APP_ID) missing.push('WECHAT_APP_ID');
    if (!e.WECHAT_MCH_ID) missing.push('WECHAT_MCH_ID');
    if (!e.WECHAT_PUB_KEY_ID) missing.push('WECHAT_PUB_KEY_ID');
    if (!e.WECHAT_NOTIFY_URL) missing.push('WECHAT_NOTIFY_URL');
    if (!e.WECHAT_PRIVATE_KEY_PATH) missing.push('WECHAT_PRIVATE_KEY_PATH');
    else if (!existsSync(resolvePemPath(e.WECHAT_PRIVATE_KEY_PATH))) {
      missing.push(
        `WECHAT_PRIVATE_KEY_PATH 文件不存在: ${e.WECHAT_PRIVATE_KEY_PATH} (resolved: ${resolvePemPath(e.WECHAT_PRIVATE_KEY_PATH)})`,
      );
    }
    if (!e.WECHAT_API_V3_KEY) missing.push('WECHAT_API_V3_KEY (用于解密回调)');
    if (!e.WECHAT_PLATFORM_PUB_KEY_PATH) {
      missing.push('WECHAT_PLATFORM_PUB_KEY_PATH (用于验签回调)');
    } else if (!existsSync(resolvePemPath(e.WECHAT_PLATFORM_PUB_KEY_PATH))) {
      missing.push(
        `WECHAT_PLATFORM_PUB_KEY_PATH 文件不存在: ${e.WECHAT_PLATFORM_PUB_KEY_PATH} (resolved: ${resolvePemPath(e.WECHAT_PLATFORM_PUB_KEY_PATH)})`,
      );
    }
    return { ok: missing.length === 0, missing };
  }

  private loadPrivateKey(): KeyObject {
    if (this.privateKey) return this.privateKey;
    const path = resolvePemPath(this.env.WECHAT_PRIVATE_KEY_PATH);
    if (!existsSync(path)) {
      throw new BadRequestException(`微信商户私钥文件不存在: ${path}`);
    }
    this.privateKey = createPrivateKey(readFileSync(path));
    return this.privateKey;
  }

  private loadPlatformPubKey(): KeyObject {
    if (this.platformPubKey) return this.platformPubKey;
    const path = resolvePemPath(this.env.WECHAT_PLATFORM_PUB_KEY_PATH);
    if (!existsSync(path)) {
      throw new BadRequestException(`微信平台公钥文件不存在: ${path}`);
    }
    this.platformPubKey = createPublicKey(readFileSync(path));
    return this.platformPubKey;
  }

  private buildAuthHeader(method: string, urlPath: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = createSign('RSA-SHA256')
      .update(message)
      .sign(this.loadPrivateKey(), 'base64');
    const e = this.env;
    return (
      `WECHATPAY2-SHA256-RSA2048 ` +
      `mchid="${e.WECHAT_MCH_ID}",` +
      `nonce_str="${nonce}",` +
      `signature="${signature}",` +
      `timestamp="${timestamp}",` +
      `serial_no="${e.WECHAT_PUB_KEY_ID}"`
    );
  }

  /** 调用 v3 Native 下单，返回 code_url（用于生成二维码） */
  async createNativeOrder(input: NativeOrderInput): Promise<{ codeUrl: string }> {
    const diag = this.diagnose();
    if (!diag.ok) {
      throw new BadRequestException(`微信支付未配置完整: ${diag.missing.join(', ')}`);
    }
    const e = this.env;
    const urlPath = '/v3/pay/transactions/native';
    const payload = {
      appid: e.WECHAT_APP_ID,
      mchid: e.WECHAT_MCH_ID,
      description: input.description,
      out_trade_no: input.outTradeNo,
      notify_url: e.WECHAT_NOTIFY_URL,
      amount: { total: input.totalFen, currency: 'CNY' },
      attach: input.attach,
    };
    const body = JSON.stringify(payload);
    const auth = this.buildAuthHeader('POST', urlPath, body);

    try {
      const resp = await axios.post<{ code_url: string }>(`${WECHAT_BASE}${urlPath}`, body, {
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'ai-saas-starter/0.1',
        },
        timeout: 15_000,
      });
      if (!resp.data?.code_url) {
        throw new BadRequestException(`微信下单未返回 code_url: ${JSON.stringify(resp.data)}`);
      }
      this.logger.log(`WeChat native order created: outTradeNo=${input.outTradeNo}`);
      return { codeUrl: resp.data.code_url };
    } catch (err) {
      if (err instanceof AxiosError) {
        const detail = err.response?.data ?? err.message;
        this.logger.error(`WeChat 下单失败: ${JSON.stringify(detail)}`);
        throw new BadRequestException(
          `微信下单失败: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
        );
      }
      throw err;
    }
  }

  /**
   * 验签微信回调/响应
   * 需要 headers: wechatpay-timestamp/nonce/signature/serial
   */
  verifySignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean {
    const get = (k: string) => {
      const v = headers[k] ?? headers[k.toLowerCase()];
      if (Array.isArray(v)) return v[0];
      return v ?? '';
    };
    const timestamp = get('wechatpay-timestamp');
    const nonce = get('wechatpay-nonce');
    const signature = get('wechatpay-signature');
    if (!timestamp || !nonce || !signature) {
      this.logger.warn('微信回调缺少签名相关 header');
      return false;
    }
    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    try {
      const ok = createVerify('RSA-SHA256')
        .update(message)
        .verify(this.loadPlatformPubKey(), Buffer.from(signature, 'base64'));
      if (!ok) this.logger.warn('微信回调签名校验失败');
      return ok;
    } catch (err) {
      this.logger.error(`验签异常: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * 解密回调 resource（AES-256-GCM）
   * resource: { ciphertext, nonce, associated_data, algorithm }
   */
  decryptResource(resource: {
    ciphertext: string;
    nonce: string;
    associated_data?: string;
    algorithm?: string;
  }): DecryptedNotifyResource {
    const apiKey = this.env.WECHAT_API_V3_KEY;
    if (!apiKey || apiKey.length !== 32) {
      throw new BadRequestException('WECHAT_API_V3_KEY 未配置或长度不为 32');
    }
    const ct = Buffer.from(resource.ciphertext, 'base64');
    // GCM: 最后 16 字节是 authTag
    const authTag = ct.subarray(ct.length - 16);
    const data = ct.subarray(0, ct.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(apiKey, 'utf8'), Buffer.from(resource.nonce, 'utf8'));
    decipher.setAuthTag(authTag);
    if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return JSON.parse(plain) as DecryptedNotifyResource;
  }

  /** 加密敏感字段（创建退款等场景用，预留） */
  encryptSensitive(plaintext: string): string {
    const pubKey = this.loadPlatformPubKey();
    const buf = Buffer.from(plaintext, 'utf8');
    const { publicEncrypt, constants } = require('crypto');
    return publicEncrypt(
      { key: pubKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
      buf,
    ).toString('base64');
  }
}
