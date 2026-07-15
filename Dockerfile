# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.20.0

FROM node:${NODE_VERSION}-bookworm-slim AS base

ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /workspace

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @url-shortener/api...

FROM dependencies AS build

COPY apps/api ./apps/api

# Prisma reads DATABASE_URL while loading its config, but `generate` does not
# connect to the database. This deliberately non-secret URL keeps credentials
# out of the build and the real URL is supplied only when the container runs.
RUN DATABASE_URL=postgresql://docker-build:docker-build@127.0.0.1:5432/docker-build \
    pnpm --filter @url-shortener/api build

FROM build AS production-dependencies

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @url-shortener/api --prod deploy --legacy /prod/api

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=production-dependencies --chown=node:node /prod/api/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./prisma
COPY --from=build --chown=node:node /workspace/apps/api/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./package.json

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

# `migrate deploy` is safe for production: it applies committed migrations only
# and uses PostgreSQL's migration lock before the API starts accepting traffic.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/server.js"]
