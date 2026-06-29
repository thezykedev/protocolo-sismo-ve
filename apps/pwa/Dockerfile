FROM node:22-alpine AS builder

WORKDIR /app

ARG SOURCE_COMMIT=local
ENV SOURCE_COMMIT=$SOURCE_COMMIT

RUN npm i -g pnpm@11.1.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/pwa/package.json apps/pwa/astro.config.mjs apps/pwa/tsconfig.json apps/pwa/playwright.config.ts ./apps/pwa/
COPY apps/pwa/public ./apps/pwa/public
COPY apps/pwa/src ./apps/pwa/src
COPY apps/pwa/tests ./apps/pwa/tests
COPY README.md CONTRIBUTING.md SECURITY.md LICENSE ./

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sismo-ve/pwa build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/pwa/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
