FROM oven/bun:1.2.17-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2.17-alpine AS build
WORKDIR /app

ARG APIAMIS_BASE_URL=https://apiamis.cianjur.space/api
ENV APIAMIS_BASE_URL=${APIAMIS_BASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

FROM oven/bun:1.2.17-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV BUN_ENV=production
ENV PORT=3000
ENV APP_PUBLIC_BASE_PATH=/pengawasan
ENV SESSION_COOKIE_NAME=pengawas_session
ENV SESSION_COOKIE_PATH=/pengawasan
ENV SESSION_COOKIE_SECURE=true
ENV APIAMIS_BASE_URL=https://apiamis.cianjur.space/api

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["bun", "run", "start"]
