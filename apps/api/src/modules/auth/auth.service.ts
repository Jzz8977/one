import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES, USER_STATUS } from '@app/shared';
import { loadEnv } from '../../config/env';
import type { ChangePasswordDto, LoginDto, RegisterDto } from '@app/shared';

const FAILED_LOGIN_LIMIT = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
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
}
