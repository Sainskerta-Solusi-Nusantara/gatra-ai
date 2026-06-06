FROM node:20-bookworm-slim AS build

WORKDIR /app

# native deps for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

COPY dashboard ./dashboard
RUN cd dashboard && npm install --no-audit --no-fund && npm run build

# ---------- Runtime ----------
FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dashboard/dist ./dashboard/dist
COPY package.json ./

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 7070
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node", "dist/api/server.js"]
