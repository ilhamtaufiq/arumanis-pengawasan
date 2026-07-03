# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2.17-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2.17-alpine AS build
WORKDIR /app

ARG APIAMIS_BASE_URL=https://apiamis.cianjur.space/api
ARG VITE_UMAMI_SCRIPT_URL=https://umami-cvkpzrlvpd23hquu71dt6s05.cianjur.space/script.js
ARG VITE_UMAMI_WEBSITE_ID=cb0064bf-1fd5-4b32-811b-14d8694d135c
ARG VITE_UMAMI_DOMAINS=arumanis.cianjur.space
ARG VITE_REVERB_HOST=apiamis.cianjur.space
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
# VITE_REVERB_APP_KEY is a public Pusher-style key (embedded in client bundle by design).
# check=skip=SecretsUsedInArgOrEnv
ARG VITE_REVERB_APP_KEY=

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN VITE_UMAMI_SCRIPT_URL="$VITE_UMAMI_SCRIPT_URL" \
    VITE_UMAMI_WEBSITE_ID="$VITE_UMAMI_WEBSITE_ID" \
    VITE_UMAMI_DOMAINS="$VITE_UMAMI_DOMAINS" \
    VITE_REVERB_APP_KEY="$VITE_REVERB_APP_KEY" \
    VITE_REVERB_HOST="$VITE_REVERB_HOST" \
    VITE_REVERB_PORT="$VITE_REVERB_PORT" \
    VITE_REVERB_SCHEME="$VITE_REVERB_SCHEME" \
    NODE_ENV=production \
    bun run build

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

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "start"]