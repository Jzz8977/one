# 部署指南

## 一键 Docker Compose

```bash
cp .env.example .env
# 编辑 .env：JWT secrets / OPENAI_API_KEY / 域名等

docker compose build
docker compose up -d

# 首次需要迁移 + seed
docker compose exec api node -e "require('child_process').execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: '/app/packages/db' })" || true
docker compose exec api pnpm --filter @app/db deploy
docker compose exec api pnpm --filter @app/db seed
```

## 默认端口与路由（nginx 反代）

| 路径 | 转发到 |
|---|---|
| `/`           | web   |
| `/admin`      | admin |
| `/api/*`      | api   |
| `/v1/*`       | api（OpenAI 兼容） |
| `/health`     | api   |

## 生产清单

- [ ] 修改 `JWT_ACCESS_SECRET` `JWT_REFRESH_SECRET`（不少于 32 字节随机）
- [ ] 修改 `BOOTSTRAP_ADMIN_PASSWORD` 或注册后立即改密
- [ ] 关闭 `auth.register_enabled` 或限制
- [ ] 配置 `OPENAI_API_KEY` 等真实 Key
- [ ] 接入真实微信/支付宝（实现 notify 签名校验）
- [ ] HTTPS（用 Caddy / Traefik / 反代 + cert-manager）
- [ ] PostgreSQL 备份策略
- [ ] 配置 CORS（`CORS_ORIGINS`）

## 升级

```bash
git pull
docker compose build
docker compose up -d
docker compose exec api pnpm --filter @app/db deploy
```
