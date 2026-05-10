import { Body, Controller, Get, Post, Req, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  type ChangePasswordDto,
  type LoginDto,
  type RefreshDto,
  type RegisterDto,
} from '@app/shared';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @Public()
  @Post('refresh')
  @UsePipes(new ZodValidationPipe(refreshSchema))
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @Post('logout')
  @UsePipes(new ZodValidationPipe(refreshSchema))
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  @Post('change-password')
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }
}
