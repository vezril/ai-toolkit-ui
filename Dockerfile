# syntax=docker/dockerfile:1

# ---- build stage: install deps and produce the standalone server bundle ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage: slim, non-root, self-contained ----
FROM node:22-alpine AS runtime
WORKDIR /app

# git → toolkit-versioning (clone/commit/push); promptfoo (pinned) → eval runs;
# the two host tools the runtime genuinely needs and can carry.
RUN apk add --no-cache git \
 && npm install -g promptfoo@0.121.17 \
 && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3210 \
    HOSTNAME=0.0.0.0 \
    HOME=/data \
    # Self-configuring defaults: the entrypoint clones the toolkit to these
    # paths and the app reads them via env. Override in compose/run as needed.
    PROJECT_ROOT=/data/evals \
    SKILLS_DIR=/data/claude-toolkit/skills \
    AGENTS_DIR=/data/claude-toolkit/agents \
    WORKFLOWS_DIR=/data/claude-toolkit/workflows \
    OLLAMA_BASE_URL=http://host.docker.internal:11434

# Next.js standalone output: server.js + traced node_modules, plus static assets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Non-root, owning the /data volume mount point.
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app \
 && mkdir -p /data && chown -R app:app /data /app
USER app

EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3210/ >/dev/null 2>&1 || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
