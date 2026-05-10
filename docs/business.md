# 业务流程

## 核心闭环

```
注册 → 登录 → 查看积分 → 选择套餐 → 创建订单 → 模拟支付 → 积分到账
   → 调用 AI → 扣积分 → 后台查看日志
```

## 用户系统

- 注册：邮箱 + 密码（zod 强校验，至少 8 位 + 字母 + 数字）
- 注册自动创建：UserProfile、CreditAccount、UserRole(user)、CreditTransaction(gift)
- 登录失败 5 次锁定 15 分钟
- access 15m / refresh 30d，refresh 一次性轮换

## 积分系统

每次余额变动**必须写流水**。流水类型：

| type | 含义 |
|---|---|
| recharge | 订单充值 |
| consume | AI 消费 |
| refund | 失败退款 |
| admin_adjust | 管理员调整 |
| gift | 注册赠送 |
| freeze / unfreeze | 预扣 / 解冻 |

代码：`apps/api/src/modules/credits/credits.service.ts`

- `change()` 在 Serializable 事务中改余额 + 写流水
- `freeze()` 把 balance → frozenBalance，扣不出抛 `InsufficientCreditsException` (402)
- `settleFrozen()` 解冻 + 实际消耗，剩余回滚到余额

## 订单与支付

- 用户选套餐 → 创建 `Order(status=pending)` + `PaymentRecord(status=created)`
- mock 支付：直接调用 `POST /api/payments/mock/success/:orderId`
- 真实支付：微信/支付宝 `notify` 接口在 `payments.controller.ts`，**TODO** 接签名校验
- `markPaid` 严格幂等：再次回调直接返回 `{ ok, idempotent }`，不会重复加积分

## AI 调用

- 流程：找模型 → 取 provider 运行时 → **预扣（freeze）** → 调用第三方 → 实际 token 计费 → settle
- 失败时全额退还冻结积分，写一条 `aiUsageLog(status=failed/timeout)`
- 价格用整数积分/1K tokens 配置（避免浮点）

## RBAC

- 角色：`user` / `admin` / `super_admin`
- 权限：`user.read` `user.update` `user.disable` `order.read` `credit.adjust` `product.manage` `ai.provider.manage` `ai.log.read` `system.setting.manage` `api_key.read`
- super_admin 视为拥有全部权限（RolesGuard 内特判）
- 在 controller / handler 上加 `@Permissions('xxx')` 自动校验

## API Key

- 用户在 `/api-keys` 页面创建，**完整 key 仅展示一次**
- 服务端只存 `keyHash` (sha256)
- `/v1/chat/completions` 用 API Key 调用，扣对应用户的积分
