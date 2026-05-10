# 阶段 15：高级功能（可后置）

下面是路线图骨架，按需启用。表结构和接口预留在 `packages/db/prisma/schema.advanced.prisma.example`，落地时合并到主 schema 即可。

## 1. 多租户 (Tenant)

```
Tenant            id, name, slug, status
TenantMember      tenantId, userId, role
TenantBilling     tenantId, planId, balance
```

接入点：
- 在 JwtAuthGuard 之后插一层 `TenantContextGuard`，从 header `X-Tenant-Id` 解析当前租户
- 所有 query 自动带 `where: { tenantId }`（建议封装 `TenantPrismaService`）
- 套餐 / 模型 / 订单都按租户隔离

## 2. 邀请码 / 分销

```
Invitation        code, inviterId, expiresAt, status
Referral          inviterId, inviteeId, createdAt
Commission        userId, sourceUserId, orderId, amount, status
```

规则示例：
- 注册时填邀请码 → 邀请双方各得 N 积分
- 被邀请用户每次充值 → 邀请人按比例返佣

## 3. 会员订阅

```
Plan              id, name, price, monthCredits, period
Subscription      userId, planId, status, periodStart, periodEnd, autoRenew
```

每月发放积分（cron 任务）：扫描 `Subscription.periodEnd <= now`，续费 + 加积分 + 写流水（type='gift'）。

## 4. OAuth 登录

```
OauthAccount      provider, providerUserId, userId
```

- GitHub: `https://github.com/login/oauth/authorize`
- Google: `https://accounts.google.com/o/oauth2/v2/auth`
- 微信扫码: 微信开放平台

接入点：在 `auth.module` 加一个 `OauthController`，回调里 `findOrCreateUser` 然后复用 `issueSession`。

## 5. OIDC Provider

把这套用户系统当登录中心：使用 [`node-oidc-provider`](https://github.com/panva/node-oidc-provider)，把 `User` 当 Account 模型，把 access/refresh 改用 OIDC 提供的 token。

> 不在第一版核心。等业务跑通、第二个产品需要 SSO 时再做。

---

## 启用方式

每个高级功能可以独立启用：

1. 在 `packages/db/prisma/schema.prisma` 末尾追加对应 model
2. `pnpm db:migrate`
3. 在 `apps/api/src/modules/` 下新增对应 module 并 wire 到 `AppModule`
4. 在前台/后台加菜单
