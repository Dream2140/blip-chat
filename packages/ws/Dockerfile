FROM node:20-alpine AS base
WORKDIR /app

# Install all workspace deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ws/package.json ./packages/ws/package.json
RUN npm ci --workspace=packages/shared --workspace=packages/ws --include-workspace-root

# Build shared
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
RUN npm run build -w packages/shared

# Build ws
COPY packages/ws ./packages/ws
RUN npm run build -w packages/ws

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=base /app/packages/ws/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/ws/dist ./dist
COPY --from=base /app/packages/shared/dist ./node_modules/@chat-app/shared/dist
COPY --from=base /app/packages/shared/package.json ./node_modules/@chat-app/shared/package.json

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wsuser
USER wsuser

EXPOSE 8080
CMD ["node", "dist/index.js"]
