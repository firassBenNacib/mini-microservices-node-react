# syntax=docker/dockerfile:1.10
FROM node:20-bookworm-slim@sha256:a82f40540f5959e0003fb7b3c0f80490def2927be8bdbee7e3e0ac65cce3be92

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn* /opt/corepack && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

RUN apt-get update && \
    apt-get install -y --no-install-recommends tini curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --chown=node:node src ./src

USER node

ENV PORT=8083
EXPOSE 8083

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:8083/health >/dev/null || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "src/index.js"]
