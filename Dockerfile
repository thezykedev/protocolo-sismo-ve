FROM node:22-alpine AS builder

WORKDIR /app

RUN npm i -g pnpm@11.1.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY astro.config.mjs tsconfig.json wrangler.toml ./
COPY public ./public
COPY src ./src
COPY .github ./.github
COPY README.md CONTRIBUTING.md SECURITY.md LICENSE ./

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
