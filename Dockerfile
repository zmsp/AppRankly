# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY app/frontend/package*.json ./app/frontend/
RUN cd app/frontend && npm ci
COPY package*.json ./
COPY app/package*.json ./app/
COPY app/frontend ./app/frontend
RUN npm run build:frontend

# --- Stage 2: Build Backend & Dependencies ---
FROM node:22-alpine AS builder
WORKDIR /build
COPY app/package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev
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

CMD ["node", "server.js"]
