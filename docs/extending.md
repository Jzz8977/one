# 二开指南

## 新增一个后台接口

1. 在 `apps/api/src/modules/<feature>/` 下建 `*.module.ts` `*.service.ts` `*.controller.ts`
2. 在 `app.module.ts` `imports` 里注册 module
3. 接口入参用 zod schema 声明（在 `packages/shared` 里），通过 `ZodValidationPipe` 校验
4. 需要权限的接口加 `@Permissions('xxx')`

## 新增一个前端页面

1. 在 `apps/web/src/pages/` 下新增 `Page.tsx`
2. 在 `App.tsx` 路由表里加 `<Route path="/foo" element={<FooPage/>} />`
3. `AppLayout.tsx` 的 `NAV` 数组里加菜单项
4. 调接口用 `import { api } from '../lib/api'`，统一走 axios + react-query

## 新增一个 AI 供应商

只要它兼容 OpenAI 风格（`/chat/completions` + `Authorization: Bearer`），步骤：

1. 在 `packages/db/prisma/seed.ts` 的 `ensureAiProviders` 里加一条
2. 在 `apps/api/src/config/env.ts` 加 `XX_BASE_URL` `XX_API_KEY`
3. 在 `apps/api/src/modules/ai/ai.service.ts` 的 `getRuntime()` 加 case
4. 后台「AI 模型」页面新增模型并设置积分价格

## 修改积分规则

- 注册赠送：通过 `auth.default_register_credits` 系统配置（后台「系统配置」页可改）
- 模型扣费倍率：直接改 `AiModel.inputPricePerKToken` / `outputPricePerKToken`（后台「AI 模型」页）
- 预扣比例：`apps/api/src/modules/ai/ai.service.ts::estimateCredits`

## 接入微信 / 支付宝

1. `.env` 配置商户号 / API Key / 公钥
2. 在 `apps/api/src/modules/payments/payments.controller.ts` 的 `wechatNotify` / `alipayNotify` 里：
   - 用对应 SDK 校验签名（**必须**）
   - 通过后调用 `orders.markPaid(...)`，幂等已保证
3. 前端「Billing」页面 `paymentMethod` 改成 `wechat` / `alipay`，下单后跳支付链接

## 切换数据库

支持任何 Prisma 支持的关系型数据库。改 `packages/db/prisma/schema.prisma` 的 `datasource db.provider` + `.env DATABASE_URL`。
