# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`ai-saas-starter` — pnpm workspace monorepo for an AI SaaS template (user system + admin + credits + recharge orders + AI proxy/billing + logs). Requires Node >= 20, pnpm >= 9.

## Commands

```bash
# One-time setup
pnpm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # start local postgres + redis
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# Dev (three separate processes)
pnpm dev:api      # NestJS on :4000
pnpm dev:web      # user app on :5173
pnpm dev:admin    # admin app on :5174

# DB
pnpm db:generate    # prisma generate
pnpm db:migrate     # prisma migrate dev (after editing schema.prisma)
pnpm db:deploy      # via: pnpm --filter @app/db deploy — for production
pnpm db:push        # prisma db push (no migration file)
pnpm db:seed        # run prisma/seed.ts
pnpm db:studio      # prisma studio GUI

# Quality
pnpm typecheck      # across all workspaces
pnpm lint
pnpm format

# Per-workspace
pnpm --filter @app/api dev
pnpm --filter @app/web build
pnpm build           # builds packages/* first, then apps/*
```

No test framework is configured.

All scripts load env via `dotenv -e ../../.env` from the repo root `.env` — do not put per-app `.env` files in app dirs.

## Architecture

### Layout
- `apps/api` — NestJS 10 backend (`@app/api`)
- `apps/web` — user-facing React + Vite (`@app/web`)
- `apps/admin` — admin React + Vite (`@app/admin`)
- `packages/db` — Prisma schema, migrations, seed (`@app/db`)
- `packages/shared` — zod schemas, types, constants used by **both** frontend and backend (`@app/shared`)
- `packages/ui` — shared React + Tailwind components (`@app/ui`)
- `docker/` — nginx conf + local data volumes
- `docs/` — `development.md`, `business.md`, `extending.md`, `deploy.md`, `wechat-pay.md`, `faq.md`

### Backend conventions (apps/api)
- Global API prefix `/api` (`health` and `version` excluded). OpenAI-compatible routes live under `/v1/*` and use **API Key** auth instead of JWT.
- All responses wrapped as `{ code, message, content }` by `ResponseInterceptor`. Errors normalized by `AllExceptionsFilter`.
- **Body parsing is custom** in `main.ts`: Nest's parser is disabled, replaced with `express.json` that caches raw bytes onto `req.rawBody`. The raw body is required for WeChat Pay v3 RSA-SHA256 callback verification — do not re-enable Nest's bodyParser.
- Throttling: global `ThrottlerGuard` (`default` 120/min, `auth` 10/min). Backed by Redis when `REDIS_URL` is set.
- Auth: JWT dual-token (access ~15m, refresh ~30d). Refresh tokens are stored hashed in the `Session` table and rotate on use. Passwords use **argon2** (not bcrypt — note the README is outdated on this).
- Permission model: roles `user` / `admin` / `super_admin`. Decorate handlers with `@Permissions('xxx')`; `super_admin` bypasses checks in `RolesGuard`.
- Modules under `apps/api/src/modules/`: `auth`, `users`, `credits`, `orders`, `payments` (+ `wechat-pay.module.ts`), `ai`, `api-keys`, `admin`, `system`, `dashboard`. Register new modules in `app.module.ts`.
- Request validation: zod schemas live in `packages/shared` and are applied via the project's `ZodValidationPipe`.

### Credits (core invariant)
Every balance change **must** write a `CreditTransaction` row in the same Serializable transaction. Types: `recharge | consume | refund | admin_adjust | gift | freeze | unfreeze`. AI calls use **freeze → call third-party → settleFrozen** (full refund on failure). Logic lives in `apps/api/src/modules/credits/credits.service.ts`. Prices are stored as integer credits per 1K tokens to avoid floats.

### Orders & payment idempotency
`orders.markPaid` is strictly idempotent — replays return `{ ok, idempotent }` without double-crediting. WeChat v3 notify (`apps/api/src/modules/payments/`) verifies signature using the raw body from `req.rawBody`. The mock path is `POST /api/payments/mock/success/:orderId`.

### AI providers
Any OpenAI-compatible provider (`/chat/completions` + Bearer auth) plugs in by: (1) row in `seed.ts::ensureAiProviders`, (2) env vars in `apps/api/src/config/env.ts`, (3) case in `ai.service.ts::getRuntime()`, (4) admin "AI 模型" page for per-model credit pricing. Preflight estimate lives in `ai.service.ts::estimateCredits`.

### Frontend conventions (apps/web, apps/admin)
- React 18 + Vite + Tailwind. Data via `@tanstack/react-query`, state via `zustand`, HTTP via a shared axios instance at `src/lib/api.ts`.
- Pages in `src/pages/*.tsx`, register in `App.tsx` routes and add nav entries to the `NAV` array in `AppLayout.tsx` / `AdminLayout.tsx`.
- Both apps build to static files served by nginx in production; in dev they hit the API directly via `VITE_API_BASE_URL`.

### Database
PostgreSQL via Prisma. Schema in `packages/db/prisma/schema.prisma`; treat it as the source of truth. After editing: `pnpm db:migrate` to generate a migration, `pnpm db:generate` to refresh the client. Seed creates the bootstrap admin (`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`) and AI provider rows.

### Deployment
Production stack is `docker-compose.yml`: `postgres`, `redis`, `api`, `web`, `admin`, `nginx` (the only service exposing :80). Nginx routing: `/` → web, `/admin` → admin, `/api/*` and `/v1/*` → api, `/health` → api. After `docker compose up -d`, run migrations inside the api container: `docker compose exec api pnpm --filter @app/db deploy`. See `docs/deploy.md` for the full checklist (rotate JWT secrets, set `CORS_ORIGINS`, configure WeChat Pay, etc.).
