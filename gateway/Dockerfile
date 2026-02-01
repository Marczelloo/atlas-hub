FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Build shared package
FROM base AS shared-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN pnpm build

# Gateway dependencies
FROM base AS gateway-deps
WORKDIR /app/gateway
COPY gateway/package.json ./
COPY --from=deps /app/node_modules ../node_modules
RUN pnpm install --frozen-lockfile

# Build gateway
FROM base AS gateway-builder
WORKDIR /app
COPY --from=gateway-deps /app/node_modules ./node_modules
COPY --from=gateway-deps /app/gateway/node_modules ./gateway/node_modules
COPY --from=shared-builder /app/packages/shared ./packages/shared
COPY gateway ./gateway
WORKDIR /app/gateway
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 atlashub

COPY --from=gateway-builder --chown=atlashub:nodejs /app/gateway/dist ./dist
COPY --from=gateway-builder --chown=atlashub:nodejs /app/gateway/node_modules ./node_modules
COPY --from=gateway-builder --chown=atlashub:nodejs /app/packages/shared/dist ./node_modules/@atlashub/shared/dist
COPY --from=gateway-builder --chown=atlashub:nodejs /app/packages/shared/package.json ./node_modules/@atlashub/shared/

USER atlashub

EXPOSE 3000

CMD ["node", "dist/index.js"]
