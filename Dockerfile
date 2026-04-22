# ── Build stage ──
FROM node:20-slim AS build
WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Set VITE_ env vars at BUILD TIME so they're baked into the bundle
# Supabase keys are safe to be public (anon key)
ARG VITE_SUPABASE_URL=https://qizfmgjjnluwizbnxypo.supabase.co
ARG VITE_SUPABASE_ANON_KEY=sb_publishable_iUXrzwGcq4aKewi6fe1cGg_xbfqyXHb

# These are needed client-side for the Live API WebSocket and TTS
# They will be served through the server proxy in production
ARG VITE_VERTEX_API_KEY=""
ARG VITE_GEMINI_LIVE_API_KEY=""
ARG VITE_GEMINI_TTS_API_KEY=""

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_VERTEX_API_KEY=$VITE_VERTEX_API_KEY
ENV VITE_GEMINI_LIVE_API_KEY=$VITE_GEMINI_LIVE_API_KEY
ENV VITE_GEMINI_TTS_API_KEY=$VITE_GEMINI_TTS_API_KEY

RUN npm run build

# ── Production stage ──
FROM node:20-slim
WORKDIR /app

# Only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend + server
COPY --from=build /app/dist ./dist
COPY server.js ./

ENV PORT=8080
EXPOSE 8080

# GEMINI_API_KEY is set via Cloud Run env vars at RUNTIME (stays server-side)
CMD ["node", "server.js"]
