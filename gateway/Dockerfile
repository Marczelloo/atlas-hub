FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Dependencies + build stage (combined for pnpm workspace)
FROM base AS builder
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY gateway/package.json ./gateway/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared ./packages/shared
COPY gateway ./gateway

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm build

# Build gateway
WORKDIR /app/gateway
RUN pnpm build

# Production dependencies
FROM base AS prod-deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY gateway/package.json ./gateway/

RUN pnpm install --frozen-lockfile --prod

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 atlashub

# Copy built code
COPY --from=builder --chown=atlashub:nodejs /app/gateway/dist ./dist
COPY --from=builder --chown=atlashub:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=atlashub:nodejs /app/packages/shared/package.json ./packages/shared/

# Copy production dependencies
COPY --from=prod-deps --chown=atlashub:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=atlashub:nodejs /app/gateway/node_modules ./gateway/node_modules

# Copy package.json for module resolution
COPY --from=builder --chown=atlashub:nodejs /app/gateway/package.json ./package.json

USER atlashub

EXPOSE 4545

CMD ["node", "dist/index.js"]
