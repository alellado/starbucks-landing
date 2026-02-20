FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/prode-api/package.json apps/prode-api/package.json
RUN pnpm install --filter @prode/api... --frozen-lockfile

FROM deps AS build
COPY apps/prode-api apps/prode-api
RUN pnpm --filter @prode/api build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/prode-api/dist /app/apps/prode-api/dist
COPY apps/prode-api/package.json /app/apps/prode-api/package.json
WORKDIR /app/apps/prode-api
EXPOSE 4100
CMD ["node", "dist/server.js"]
