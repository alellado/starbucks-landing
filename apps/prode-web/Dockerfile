FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/prode-web/package.json apps/prode-web/package.json
RUN pnpm install --filter @prode/web... --frozen-lockfile

FROM deps AS build
COPY apps/prode-web apps/prode-web
RUN pnpm --filter @prode/web build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/prode-web/.next /app/apps/prode-web/.next
COPY --from=build /app/apps/prode-web/public /app/apps/prode-web/public
COPY apps/prode-web/package.json /app/apps/prode-web/package.json
WORKDIR /app/apps/prode-web
EXPOSE 3000
CMD ["pnpm", "start"]
