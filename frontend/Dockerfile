# FANUC Next.js Dockerfile（Next.js Standalone）
FROM node:18-alpine AS base

WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 通过 build args 注入构建期需要的环境变量（避免依赖未提交的 .env.production）
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_DESCRIPTION
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID
ARG NEXT_PUBLIC_PAYPAL_ENVIRONMENT

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
ENV NEXT_PUBLIC_SITE_DESCRIPTION=${NEXT_PUBLIC_SITE_DESCRIPTION}
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=${NEXT_PUBLIC_PAYPAL_CLIENT_ID}
ENV NEXT_PUBLIC_PAYPAL_ENVIRONMENT=${NEXT_PUBLIC_PAYPAL_ENVIRONMENT}

RUN npm run build

FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
