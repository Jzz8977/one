import { Body, Controller, Get, HttpCode, Logger, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrdersService } from '../orders/orders.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { WechatPayService } from './wechat-pay.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private orders: OrdersService, private wechat: WechatPayService) {}

  /**
   * 模拟支付：用户登录态下调用，立即标记订单已支付。
   * 仅适用于演示/测试。
   */
  @Post('mock/success/:orderId')
  mockSuccess(@CurrentUser() _user: RequestUser, @Param('orderId') orderId: string) {
    return this.orders.markPaid({ orderId, method: 'mock' });
  }

  /** 检查微信支付配置是否完整 */
  @Get('wechat/status')
  wechatStatus() {
    return this.wechat.diagnose();
  }

  /**
   * 微信支付回调（v3 新公钥模式）
   * 流程：验签 → AES-GCM 解密 resource → trade_state=SUCCESS → markPaid
   * 必须返回 200 + {code:'SUCCESS'} 或 4xx + {code:'FAIL', message}
   */
  @Public()
  @Post('wechat/notify')
  @HttpCode(200)
  async wechatNotify(
    @Body() body: { resource?: { ciphertext: string; nonce: string; associated_data?: string } },
    @Req() req: Request & { rawBody?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawBody = req.rawBody ?? JSON.stringify(body);

    if (!this.wechat.verifySignature(req.headers, rawBody)) {
      res.status(401);
      return { code: 'FAIL', message: '签名校验失败' };
    }
    if (!body.resource) {
      res.status(400);
      return { code: 'FAIL', message: '缺少 resource' };
    }

    let decrypted;
    try {
      decrypted = this.wechat.decryptResource(body.resource);
    } catch (e) {
      this.logger.error(`微信回调解密失败: ${(e as Error).message}`);
      res.status(400);
      return { code: 'FAIL', message: '解密失败' };
    }

    this.logger.log(
      `WeChat notify: outTradeNo=${decrypted.out_trade_no} state=${decrypted.trade_state}`,
    );

    if (decrypted.trade_state === 'SUCCESS') {
      try {
        await this.orders.markPaid({
          orderNo: decrypted.out_trade_no,
          outTradeNo: decrypted.transaction_id,
          method: 'wechat',
          rawNotify: { resource: decrypted, headers: req.headers },
        });
      } catch (e) {
        this.logger.error(`markPaid 失败: ${(e as Error).message}`);
        res.status(500);
        return { code: 'FAIL', message: '业务处理失败' };
      }
    }
    return { code: 'SUCCESS', message: 'OK' };
  }

  /** 支付宝（占位） */
  @Public()
  @Post('alipay/notify')
  async alipayNotify(@Body() body: Record<string, unknown>, @Req() req: Request) {
    const orderNo = String(body.out_trade_no ?? '');
    const outTradeNo = String(body.trade_no ?? '');
    const status = String(body.trade_status ?? '');
    if (!orderNo || !['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(status)) return 'failure';
    await this.orders.markPaid({
      orderNo,
      outTradeNo,
      method: 'alipay',
      rawNotify: { headers: req.headers, body },
    });
    return 'success';
  }
}
