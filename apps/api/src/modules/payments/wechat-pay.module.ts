import { Global, Module } from '@nestjs/common';
import { WechatPayService } from './wechat-pay.service';

@Global()
@Module({
  providers: [WechatPayService],
  exports: [WechatPayService],
})
export class WechatPayModule {}
