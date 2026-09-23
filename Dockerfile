# ==============================================================================
# Stage 1: Build Frontend and Backend
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package manifests for optimized layer caching
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy complete project source code
COPY . .

# Build both backend (tsc) and frontend (tsc -b && vite build)
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy root and workspace package manifests
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install production-only dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled backend output from builder
COPY --from=builder /app/server/dist ./server/dist

# Copy compiled frontend SPA bundle from builder
COPY --from=builder /app/client/dist ./client/dist

# Create storage directories for SQLite DB and student uploads
RUN mkdir -p /app/server/data /app/server/uploads && \
    chown -R node:node /app

# Run under secure non-root user
USER node

EXPOSE 5000

# Container healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the full-stack server (serves API + SPA + uploads)
CMD ["node", "server/dist/index.js"]
