import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';
import { WechatController } from './wechat.controller';
import { WechatService } from './wechat.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret',
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m' },
    }),
  ],
  controllers: [AuthController, GoogleController, WechatController],
  providers: [
    AuthService,
    GoogleService,
    WechatService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
