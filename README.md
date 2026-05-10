# AI SaaS User System Starter

一个开箱即用的 **AI SaaS 用户系统模板**：用户系统 + 管理后台 + 积分系统 + 充值订单 + AI 调用扣费 + 调用日志 + 可二开模板。

## 仓库结构

```
apps/web        # 用户端（React + Vite）
apps/admin      # 管理后台（React + Vite）
apps/api        # 后端（NestJS + Prisma）
packages/db     # Prisma schema / migrations / seed
packages/shared # 共享类型 / Zod schema / 常量
packages/ui     # 公共 UI 组件
```

## 技术栈

- pnpm workspace monorepo
- React 18 + Vite + TailwindCSS（前端）
- NestJS 10 + Prisma + PostgreSQL（后端）
- JWT 双 Token、Bcrypt
- Zod 共享校验
- Redis（限流 / refresh token，可选）

## 快速开始

```bash
pnpm install
cp .env.example .env

# 启动 Postgres（可用 docker compose 起一个）
docker compose -f docker-compose.dev.yml up -d postgres

# 生成 Prisma Client + 迁移 + Seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 启动三端
pnpm dev:api     # http://localhost:4000
pnpm dev:web     # http://localhost:5173
pnpm dev:admin   # http://localhost:5174
```

## 默认账号

Seed 后默认创建：

- 管理员：`admin@example.com` / `Admin@12345`（可在 `.env` 中配置）
- 测试用户：`user@example.com` / `User@12345`

## 核心闭环

注册 → 登录 → 查看积分 → 选择套餐 → 创建订单 → 模拟支付 → 积分到账 → 调用 AI → 扣积分 → 后台查看日志。

## 文档

详见 [`docs/`](./docs)：

- [开发指南](./docs/development.md)
- [业务流程](./docs/business.md)
- [二开指南](./docs/extending.md)
- [部署指南](./docs/deploy.md)
- [常见问题](./docs/faq.md)

## License

MIT
