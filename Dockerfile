# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ docker-cli

# Copy and install gateway
COPY gateway/package*.json ./gateway/
RUN cd gateway && npm ci

COPY gateway/tsconfig.json ./gateway/
COPY gateway/src ./gateway/src
RUN cd gateway && npm run build

# Copy and build UI
COPY web-ui/package*.json ./web-ui/
RUN cd web-ui && npm ci

COPY web-ui/tsconfig.json ./web-ui/
COPY web-ui/public ./web-ui/public
COPY web-ui/src ./web-ui/src
RUN cd web-ui && npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache docker-cli

# Copy built gateway
COPY --from=builder /app/gateway/dist ./gateway/dist
COPY --from=builder /app/gateway/node_modules ./gateway/node_modules
COPY --from=builder /app/gateway/package*.json ./gateway/

# Copy built UI
COPY --from=builder /app/web-ui/build ./web-ui/build

# Copy skills
COPY skills ./skills

# Create directories
RUN mkdir -p moltbook logs

EXPOSE 3000 3001

ENV NODE_ENV=production
ENV PORT=3000
ENV WS_PORT=3001

CMD ["node", "gateway/dist/server.js"]
