# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY package*.json ./
COPY app/package*.json ./app/
COPY app/frontend/package*.json ./app/frontend/
RUN cd app/frontend && npm ci
COPY . ./
RUN npm run build

# --- Stage 2: Build Backend & Dependencies ---
FROM node:20-alpine AS builder
WORKDIR /build
COPY app/package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev
COPY app/ ./
# Remove frontend source code to keep the builder stage clean
RUN rm -rf frontend

# --- Stage 3: Minimal Production Runtime ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Use non-root node user for security
RUN mkdir -p /app/data && chown -R node:node /app
USER node

# Copy everything from builder (backend code + production node_modules)
COPY --from=builder --chown=node:node /build ./

# Copy built frontend assets from Stage 1
# Overwrites the public folder with the fresh production build
COPY --from=frontend-builder --chown=node:node /build/app/public ./public

# Expose backend application port
EXPOSE 3000

CMD ["node", "server.js"]
