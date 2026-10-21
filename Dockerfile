# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Install dependencies first so this layer is cached between code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
# Build a standalone Node server instead of the adapter-auto output.
ENV SVELTEKIT_ADAPTER=node
# WHY DB_TYPE here: the build imports server routes to analyse them, and the database
# module refuses to load without DB_TYPE. This value exists only during the build;
# the real one comes from the container's environment at runtime.
RUN DB_TYPE=memory pnpm build && pnpm prune --prod

# ---- Runtime stage --------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    # Pastes can be up to MAX_PASTE_BYTES (10 MiB by default) of ciphertext plus JSON
    # overhead. adapter-node's default request limit is 512 KB, which is too small.
    BODY_SIZE_LIMIT=12M

COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "build"]
