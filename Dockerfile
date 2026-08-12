# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build

# Copy only frontend manifest first so npm ci layer is only invalidated
# when frontend dependencies change
COPY app/frontend/package*.json ./app/frontend/
RUN --mount=type=cache,target=/root/.npm \
    cd app/frontend && npm ci

# Copy frontend source code - cache hit on clean source changes
COPY app/frontend/ ./app/frontend/
RUN cd app/frontend && npm run build

# --- Stage 2: Build Backend & Dependencies ---
FROM node:22-alpine AS builder
WORKDIR /build

# Copy backend manifest first
COPY app/package*.json ./
# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy only specific backend source code folders and files
# This prevents frontend source changes from invalidating the backend cache layer
COPY app/server.js app/cli.js app/generate_static_data.js app/download_model.js ./
COPY app/lib/ ./lib/
COPY app/routes/ ./routes/
COPY app/static_assets/ ./static_assets/

# --- Stage 3: Minimal Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install git early so it stays cached
# Setup directory and permissions in a single layer
RUN apk add --no-cache git && \
    mkdir -p /app/data && \
    chown -R node:node /app

# Use non-root node user for security
USER node

# Copy backend code & installed node_modules from builder
COPY --from=builder --chown=node:node /build ./

# Copy built frontend static assets from frontend-builder
# This is copied separately so that frontend-only changes don't require rebuilding the backend layers
COPY --from=frontend-builder --chown=node:node /build/app/public ./public

# Expose backend application port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]
