# ── Build stage ──
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production stage ──
FROM node:20-slim
WORKDIR /app

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets and server
COPY --from=build /app/dist ./dist
COPY server.js ./

# Port Cloud Run uses
ENV PORT=8080
EXPOSE 8080

# The GEMINI_API_KEY is set via Cloud Run secrets/env vars, NOT baked into the image
CMD ["node", "server.js"]
