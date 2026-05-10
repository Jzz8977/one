import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from '../orders/orders.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private orders: OrdersService) {}

  /**
   * 模拟支付：用户登录态下调用，立即标记订单已支付。
   * 仅适用于演示/测试。
   */
  @Post('mock/success/:orderId')
  mockSuccess(@CurrentUser() _user: RequestUser, @Param('orderId') orderId: string) {
    return this.orders.markPaid({ orderId, method: 'mock' });
  }

  /**
   * 微信支付回调（占位）。需要：签名校验 + XML 解析 + 幂等。
   * 实际接入请实现签名校验，然后调用 orders.markPaid。
   */
  @Public()
  @Post('wechat/notify')
  async wechatNotify(@Body() body: Record<string, unknown>, @Req() req: Request) {
    // TODO: 校验签名
    const orderNo = String(body.out_trade_no ?? '');
    const outTradeNo = String(body.transaction_id ?? '');
    if (!orderNo) return { return_code: 'FAIL', return_msg: 'missing out_trade_no' };
    await this.orders.markPaid({
      orderNo,
      outTradeNo,
      method: 'wechat',
      rawNotify: { headers: req.headers, body },
    });
    return { return_code: 'SUCCESS', return_msg: 'OK' };
  }

  /**
   * 支付宝支付回调（占位）。
   */
  @Public()
  @Post('alipay/notify')
  async alipayNotify(@Body() body: Record<string, unknown>, @Req() req: Request) {
    // TODO: 校验签名
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
