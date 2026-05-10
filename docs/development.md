# 开发指南

## 环境要求

- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 14（或用 docker-compose.dev.yml）
- Docker（可选，用于本地依赖）

## 一次性设置

```bash
pnpm install
cp .env.example .env

# 启动本地依赖
docker compose -f docker-compose.dev.yml up -d

# 生成 Prisma Client + 迁移 + Seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## 启动开发服务

```bash
pnpm dev:api    # http://localhost:4000
pnpm dev:web    # http://localhost:5173
pnpm dev:admin  # http://localhost:5174
```

## 默认账号

由 seed 创建（首次执行 `pnpm db:seed`）：

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 超级管理员 | admin@example.com | Admin@12345 |
| 普通用户 | user@example.com | User@12345 |

可在 `.env` 中通过 `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` 自定义。

## 常用命令

```bash
pnpm typecheck            # 全仓 typescript 校验
pnpm db:studio            # Prisma Studio
pnpm --filter @app/api dev
pnpm --filter @app/web build
```

## 目录约定

```
apps/api      # NestJS 后端
apps/web      # 用户端
apps/admin    # 管理后台
packages/db   # Prisma schema + seed
packages/shared # zod schema、types、constants
packages/ui   # 公共 UI（React + Tailwind）
docker/       # nginx + 持久卷
docs/         # 文档
```

## API 调用约定

- 所有响应包装为 `{ code, message, content }`
- 鉴权头：`Authorization: Bearer <accessToken>`
- access 短（默认 15m），refresh 长（默认 30d，session 表存 hash 可撤销）
- API Key 调用走 `/v1/chat/completions`，无需 `/api` 前缀
