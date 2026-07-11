# URL Shortener

A production-minded URL shortener built to demonstrate backend fundamentals:
short links, custom aliases, redirect caching, rate limiting, and click analytics.

## Tech stack

- Frontend: React + Vite (planned)
- API: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma
- Cache: Redis

## Current backend flow

The API currently supports the core URL shortener loop:

```txt
POST /api/links
-> validate the submitted URL and optional custom alias
-> save the short link in PostgreSQL
-> return the generated short path

GET /:slug
-> look up the slug in Redis first
-> fall back to PostgreSQL and cache the result when Redis misses
-> return 404 if it does not exist
-> return 410 if the link is inactive or expired
-> record a click event
-> redirect the browser to the original URL with HTTP 302

GET /api/links/:slug/stats
-> return total clicks and the 10 most recent click events
```

Example create request:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/links `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"url":"https://example.com","customAlias":"demo-link"}'
```

Then open `http://localhost:3000/demo-link` in the browser to test the redirect.

## Backend roadmap

- [x] Create short links
- [x] Redirect short links to original URLs
- [x] Track click analytics
- [x] Add Redis caching for redirects
- [ ] Add rate limiting

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
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```
