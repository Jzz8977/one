import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES, USER_STATUS } from '@app/shared';
import { loadEnv } from '../../config/env';
import type { ChangePasswordDto, LoginDto, RegisterDto } from '@app/shared';
import type { GoogleProfile } from './google.service';
import type { WechatProfile } from './wechat.service';

const FAILED_LOGIN_LIMIT = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private hashRefresh(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async getOrCreateUserRole() {
    return this.prisma.role.upsert({
      where: { name: ROLES.USER },
      update: {},
      create: { name: ROLES.USER, description: '普通用户', isSystem: true },
    });
  }

  private async signTokens(userId: string, email: string) {
    const env = loadEnv();
    const access = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_EXPIRES },
    );
    const refresh = await this.jwt.signAsync(
      { sub: userId, type: 'refresh', jti: randomBytes(8).toString('hex') },
      { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES },
    );
    return { access, refresh };
  }

  private parseExpiresMs(s: string): number {
    const m = /^(\d+)([smhd])$/.exec(s);
    if (!m) return 15 * 60 * 1000;
    const n = Number(m[1]);
    switch (m[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60 * 1000;
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      default: return n * 1000;
    }
  }

  async register(dto: RegisterDto, meta: { ip?: string; ua?: string }) {
    const env = loadEnv();
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'auth.register_enabled' } });
    if (setting?.value === 'false') throw new ForbiddenException('当前已关闭注册');

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('邮箱已被注册');

    const role = await this.getOrCreateUserRole();
    const giftSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'auth.default_register_credits' },
    });
    const initialCredits = Number(giftSetting?.value ?? env.DEFAULT_REGISTER_CREDITS);
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          status: USER_STATUS.ACTIVE,
          profile: { create: { nickname: dto.nickname ?? dto.email.split('@')[0] } },
          creditAccount: { create: { balance: initialCredits } },
          roles: { create: { roleId: role.id } },
        },
      });
      if (initialCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: u.id,
            type: 'gift',
            amount: initialCredits,
            balanceAfter: initialCredits,
            remark: '注册赠送',
          },
        });
      }
      return u;
    });

    return this.issueSession(user.id, user.email, meta);
  }

  async login(dto: LoginDto, meta: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('账号或密码错误');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('账号已被临时锁定，请稍后再试');
    }
    if (user.status !== USER_STATUS.ACTIVE) throw new ForbiddenException('账号已被禁用');
    if (!user.passwordHash) {
      throw new UnauthorizedException('该账号未设置密码，请使用 Google 登录');
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      const newCount = user.failedLoginCount + 1;
      const data: { failedLoginCount: number; lockedUntil?: Date } = { failedLoginCount: newCount };
      if (newCount >= FAILED_LOGIN_LIMIT) {
        data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
        data.failedLoginCount = 0;
      }
      await this.prisma.user.update({ where: { id: user.id }, data });
      throw new UnauthorizedException('账号或密码错误');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    return this.issueSession(user.id, user.email, meta);
  }

  private async issueSession(userId: string, email: string, meta: { ip?: string; ua?: string }) {
    const env = loadEnv();
    const { access, refresh } = await this.signTokens(userId, email);
    const refreshExpMs = this.parseExpiresMs(env.JWT_REFRESH_EXPIRES);
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashRefresh(refresh),
        userAgent: meta.ua,
        ip: meta.ip,
        expiresAt: new Date(Date.now() + refreshExpMs),
      },
    });
    return {
      accessToken: access,
      refreshToken: refresh,
      expiresIn: Math.floor(this.parseExpiresMs(env.JWT_ACCESS_EXPIRES) / 1000),
    };
  }

  async refresh(refreshToken: string, meta: { ip?: string; ua?: string }) {
    const env = loadEnv();
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('refresh token 无效');
    }
    const hash = this.hashRefresh(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('会话已失效');
    }
    if (session.userId !== payload.sub) throw new UnauthorizedException('会话错乱');

    // 轮换：旧 session 撤销，签发新 token
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== USER_STATUS.ACTIVE) throw new UnauthorizedException('用户不可用');
    return this.issueSession(user.id, user.email, meta);
  }

  async logout(refreshToken: string) {
    const hash = this.hashRefresh(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        creditAccount: true,
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    const roles = user.roles.map((r) => r.role.name);
    const permissions = Array.from(
      new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code))),
    );
    return {
      id: user.id,
      email: user.email,
      nickname: user.profile?.nickname,
      avatar: user.profile?.avatar,
      bio: user.profile?.bio,
      status: user.status,
      roles,
      permissions,
      creditBalance: user.creditAccount?.balance ?? 0,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!user.passwordHash) throw new BadRequestException('账号未设置密码，请先用 Google 登录后绑定密码');
    const ok = await argon2.verify(user.passwordHash, dto.oldPassword);
    if (!ok) throw new BadRequestException('原密码错误');
    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  /**
   * Google 登录的核心：把 Google 的 profile 落到本地 User 表。
   *
   *  A. googleSub 已存在 → 直接登录
   *  B. googleSub 不存在但 verified email 命中 → 自动绑定 googleSub，登录
   *  C. 都没有 → 新建 User + UserProfile + CreditAccount + UserRole + gift 流水
   *
   * 最后无论哪条分支，都走与邮箱登录完全相同的 issueSession 发证。
   */
  async findOrCreateGoogle(profile: GoogleProfile, meta: { ip?: string; ua?: string }) {
    const env = loadEnv();

    // A. googleSub 命中
    const byGoogle = await this.prisma.user.findUnique({ where: { googleSub: profile.sub } });
    if (byGoogle) {
      if (byGoogle.status !== USER_STATUS.ACTIVE) throw new ForbiddenException('账号已被禁用');
      await this.prisma.user.update({
        where: { id: byGoogle.id },
        data: { lastLoginAt: new Date() },
      });
      return this.issueSession(byGoogle.id, byGoogle.email, meta);
    }

    // B. 已验证邮箱命中 → 自动绑定
    if (profile.email && profile.emailVerified) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        if (byEmail.status !== USER_STATUS.ACTIVE) throw new ForbiddenException('账号已被禁用');
        await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { googleSub: profile.sub, lastLoginAt: new Date() },
        });
        this.logger.log(`linked googleSub to existing user ${byEmail.id}`);
        return this.issueSession(byEmail.id, byEmail.email, meta);
      }
    }

    // C. 全新用户：完整 bootstrap
    if (!profile.email) {
      throw new BadRequestException('Google 未返回 email，无法创建账号');
    }
    const role = await this.prisma.role.upsert({
      where: { name: ROLES.USER },
      update: {},
      create: { name: ROLES.USER, description: '普通用户', isSystem: true },
    });
    const giftSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'auth.default_register_credits' },
    });
    const initialCredits = Number(giftSetting?.value ?? env.DEFAULT_REGISTER_CREDITS);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: profile.email!,
          googleSub: profile.sub,
          status: USER_STATUS.ACTIVE,
          lastLoginAt: new Date(),
          profile: {
            create: {
              nickname: profile.name ?? profile.email!.split('@')[0],
              avatar: profile.picture ?? null,
            },
          },
          creditAccount: { create: { balance: initialCredits } },
          roles: { create: { roleId: role.id } },
        },
      });
      if (initialCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: u.id,
            type: 'gift',
            amount: initialCredits,
            balanceAfter: initialCredits,
            remark: 'Google 注册赠送',
          },
        });
      }
      return u;
    });
    this.logger.log(`new user created via Google: ${user.id}`);
    return this.issueSession(user.id, user.email, meta);
  }

  /**
   * 微信扫码登录的核心：把微信 profile 落到本地 User 表。
   *
   *  A. wechatUnionId 已存在 → 直接登录
   *  B. 不存在 → 新建 User + UserProfile + CreditAccount + UserRole + gift 流水
   *
   * 微信不返回 email，所以无法走 "email 匹配自动绑定" 分支。
   */
  async findOrCreateWechat(profile: WechatProfile, meta: { ip?: string; ua?: string }) {
    const env = loadEnv();

    // A. 已绑过
    const existing = await this.prisma.user.findUnique({ where: { wechatUnionId: profile.uid } });
    if (existing) {
      if (existing.status !== USER_STATUS.ACTIVE) throw new ForbiddenException('账号已被禁用');
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date() },
      });
      return this.issueSession(existing.id, existing.email ?? '', meta);
    }

    // B. 全新用户
    const role = await this.prisma.role.upsert({
      where: { name: ROLES.USER },
      update: {},
      create: { name: ROLES.USER, description: '普通用户', isSystem: true },
    });
    const giftSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'auth.default_register_credits' },
    });
    const initialCredits = Number(giftSetting?.value ?? env.DEFAULT_REGISTER_CREDITS);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: null,
          wechatUnionId: profile.uid,
          status: USER_STATUS.ACTIVE,
          lastLoginAt: new Date(),
          profile: {
            create: {
              nickname: profile.nickname ?? `微信用户_${profile.uid.slice(0, 6)}`,
              avatar: profile.avatar,
            },
          },
          creditAccount: { create: { balance: initialCredits } },
          roles: { create: { roleId: role.id } },
        },
      });
      if (initialCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: u.id,
            type: 'gift',
            amount: initialCredits,
            balanceAfter: initialCredits,
            remark: '微信注册赠送',
          },
        });
      }
      return u;
    });
    this.logger.log(`new user created via WeChat: ${user.id}`);
    return this.issueSession(user.id, user.email ?? '', meta);
  }

  /**
   * 短信验证码登录：手机号命中则直接登录；没命中就 bootstrap 一个新用户。
   * 验证码的校验在 controller 调用 SmsService 完成后才进入这里。
   */
  async findOrCreateByPhone(phone: string, meta: { ip?: string; ua?: string }) {
    const env = loadEnv();

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      if (existing.status !== USER_STATUS.ACTIVE) throw new ForbiddenException('账号已被禁用');
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      });
      return this.issueSession(existing.id, existing.email ?? '', meta);
    }

    const role = await this.getOrCreateUserRole();
    const giftSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'auth.default_register_credits' },
    });
    const initialCredits = Number(giftSetting?.value ?? env.DEFAULT_REGISTER_CREDITS);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: null,
          phone,
          status: USER_STATUS.ACTIVE,
          lastLoginAt: new Date(),
          profile: {
            create: {
              nickname: `用户_${phone.slice(-4)}`,
            },
          },
          creditAccount: { create: { balance: initialCredits } },
          roles: { create: { roleId: role.id } },
        },
      });
      if (initialCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: u.id,
            type: 'gift',
            amount: initialCredits,
            balanceAfter: initialCredits,
            remark: '手机号注册赠送',
          },
        });
      }
      return u;
    });
    this.logger.log(`new user created via SMS: ${user.id}`);
    return this.issueSession(user.id, user.email ?? '', meta);
  }
}
