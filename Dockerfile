# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Copy only frontend manifest first to leverage caching
COPY app/frontend/package*.json ./frontend/
RUN --mount=type=cache,target=/root/.npm \
    cd frontend && npm ci

# Copy frontend source code and build
COPY app/frontend/ ./frontend/
RUN cd frontend && npm run build

# --- Stage 2: Build Backend & Production Dependencies ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy backend manifest first
COPY app/package*.json ./
# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy only specific backend source code folders and files
# Kept in identical structure to prevent breaking internal paths
COPY app/server.js app/cli.js app/generate_static_data.js ./
COPY app/lib/ ./lib/
COPY app/routes/ ./routes/


# --- Stage 3: Minimal Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install git safely and set up application directory permissions
RUN apk add --no-cache git \
    && mkdir -p /app/data \
    && chown -R node:node /app

# Use non-root node user for security
USER node

# Copy backend code & production node_modules from builder
COPY --from=builder --chown=node:node /app ./

# Copy built frontend static assets from frontend-builder into the expected backend public directory
# Adjust the source path to match where your frontend build outputs assets (usually dist or public)
COPY --from=frontend-builder --chown=node:node /app/public ./public

# Expose backend application port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]