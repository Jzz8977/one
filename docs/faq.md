# 常见问题

## 启动 api 报 `Invalid environment variables`

`.env` 缺少必填项。检查 `JWT_ACCESS_SECRET` `JWT_REFRESH_SECRET` `DATABASE_URL`（至少 8 位）。

## prisma migrate 卡住 / 失败

确保 PostgreSQL 已启动且 `DATABASE_URL` 正确。也可以用 `pnpm db:push` 直接同步 schema（开发期）。

## AI 调用 400 `未配置 xxx 的 API Key`

后台「AI 模型」对应的 provider，需要在 `.env` 中配置 `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `SILICONFLOW_API_KEY`。

## 已经支付却没加积分

- 看 `PaymentRecord.status` 是否为 `success`
- 看 `Order.status` 是否为 `paid`
- 流水里看 `CreditTransaction(type=recharge, refType=order, refId=<orderId>)`
- 重新触发 mock 支付不会重复加积分（幂等保证）

## API Key 找不到了

只在创建那一次返回，丢失只能新建一个。已禁用的 key 不会反映在第三方应用里——按需轮换。

## 想关闭注册

后台「系统配置」把 `auth.register_enabled` 设为 `false`。

## 用户禁用后还能登录

`User.status='disabled'` 时：login 直接 403；已签发的 access token 在 JwtAuthGuard 中也会被拒绝（每次请求查 user.status）。
