# URL Shortener

A production-minded URL shortener built to demonstrate backend fundamentals:
short links, custom aliases, redirect caching, rate limiting, and click analytics.

## Tech stack

- Frontend: React + Vite (planned)
- API: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma (planned)
- Cache: Redis (planned)

## Local development

Requirements: Node.js 22+, pnpm 10+, and Docker Desktop.

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
pnpm db:start
pnpm db:migrate
pnpm dev
```

The API is available at `http://localhost:3000`. Check it with:

```powershell
curl http://localhost:3000/api/health
```

Stop the local database without deleting its data:

```powershell
pnpm db:stop
```

## Commands

```powershell
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```
