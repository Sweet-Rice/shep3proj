# Build context is the repository root (see docker-compose.yml). The type
# generator (scripts/generate-types.mjs) and the demo-mode data import both
# reach up to ../../docs relative to frontend/, so docs/ must be present
# at build time even though the runtime image never needs it.
FROM node:22.12-slim AS build

WORKDIR /repo

COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix frontend

COPY frontend/ frontend/
COPY docs/ docs/

WORKDIR /repo/frontend
RUN npm run build

FROM node:22.12-slim
RUN npm install -g serve@14
WORKDIR /app
COPY --from=build /repo/frontend/dist ./dist

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD node -e "fetch('http://localhost:5173').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["serve", "-s", "dist", "-l", "5173"]
