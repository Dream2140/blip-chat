FROM node:20-alpine AS base
WORKDIR /app

# Install all workspace deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/web/package.json ./packages/web/package.json
RUN npm ci --workspace=packages/shared --workspace=packages/web --include-workspace-root

# Build shared
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
RUN npm run build -w packages/shared

# Build web
COPY packages/web ./packages/web
WORKDIR /app/packages/web
RUN npx prisma generate

# NEXT_PUBLIC_ vars must be set at build time to be inlined in client JS
ENV NEXT_PUBLIC_WS_URL=wss://blip-chat-ws.fly.dev
RUN npm run build

# Debug: show standalone structure
RUN ls -la .next/standalone/ && ls -la .next/standalone/packages/web/ || true

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output — in monorepo the structure preserves workspace paths
COPY --from=base /app/packages/web/.next/standalone/ ./
COPY --from=base /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=base /app/packages/web/public ./packages/web/public

# Copy prisma schema + migrations for runtime migrate deploy
COPY --from=base /app/packages/web/prisma ./packages/web/prisma
COPY --from=base /app/packages/web/node_modules/.prisma ./packages/web/node_modules/.prisma
COPY --from=base /app/packages/web/node_modules/@prisma ./packages/web/node_modules/@prisma
COPY --from=base /app/node_modules/prisma ./node_modules/prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

# Run migrations then start server
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema=packages/web/prisma/schema.prisma && node packages/web/server.js"]
