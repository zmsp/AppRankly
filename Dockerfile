# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build
# Copy ALL package manifests first so npm ci layer is only invalidated
# when dependencies change, not when source code changes
COPY package*.json ./
COPY app/package*.json ./app/
COPY app/frontend/package*.json ./app/frontend/
RUN --mount=type=cache,target=/root/.npm \
    cd app/frontend && npm ci
# Source code copied after install — cache hit on clean source changes
COPY app/frontend ./app/frontend
RUN cd app/frontend && npm run build

# --- Stage 2: Build Backend & Dependencies ---
FROM node:22-alpine AS builder
WORKDIR /build
COPY app/package*.json ./
# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev
COPY app/ ./
# Remove frontend source code to keep runtime bundle light
RUN rm -rf frontend

# --- Stage 3: Minimal Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Use non-root node user for security
RUN mkdir -p /app/data && chown -R node:node /app
USER node

# Copy backend code & installed node_modules from builder
COPY --from=builder --chown=node:node /build ./

# Copy built frontend static assets from frontend-builder
COPY --from=frontend-builder --chown=node:node /build/app/public ./public

# Expose backend application port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]
