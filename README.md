# URL Shortener

A production-minded URL shortener built to demonstrate backend fundamentals:
short links, custom aliases, redirect caching, rate limiting, and click analytics.

## Tech stack

- Frontend: React + Vite (planned)
- API: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma (planned)
- Cache: Redis (planned)

## Local development

Requirements: Node.js 22+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

The API is available at `http://localhost:3000`. Check it with:

```bash
curl http://localhost:3000/api/health
```

## Commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```
