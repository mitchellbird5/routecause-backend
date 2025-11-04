# ============================
# Stage 1: Base builder
# ============================
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache bash git curl git-lfs dos2unix

COPY package*.json ./
RUN npm ci

COPY ./src ./src
COPY tsconfig.json ./
COPY jest.config.js ./
COPY ./tests ./tests
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN dos2unix /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

# Build the app for production
RUN npm run build

# ============================
# Stage 2: Development
# ============================
FROM node:22-alpine AS development
WORKDIR /app
RUN apk add --no-cache bash git curl git-lfs dos2unix

ENV NODE_ENV=development

COPY --from=builder /usr/local/bin/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY package*.json ./
RUN npm install

COPY ./src ./src
COPY tsconfig.json ./

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ============================
# Stage 3: Production
# ============================
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache bash curl

ENV NODE_ENV=production

# Copy only necessary files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /usr/local/bin/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/api/server.js"]

# ============================
# Stage 4: DevLive (production env + dev tooling)
# ============================
FROM node:22-alpine AS devlive
WORKDIR /app

RUN apk add --no-cache bash git curl git-lfs dos2unix python3 make g++

# Copy entrypoint
COPY --from=builder /usr/local/bin/entrypoint.sh /usr/local/bin/entrypoint.sh

# Copy package files first
COPY package*.json ./

# Force install all deps (including dev) cleanly
RUN npm install --include=dev
RUN npm install --save-dev @types/node

# Explicitly ensure ts-node-dev is available globally
RUN npm install -g ts-node-dev

# Copy source
COPY ./src ./src
COPY tsconfig.json ./

# Runtime env is production (your logic depends on it)
ENV NODE_ENV=production

EXPOSE 9229

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ============================
# Stage 5: CI (production environment + test tooling)
# ============================
FROM node:22-alpine AS ci
WORKDIR /app

RUN apk add --no-cache bash git curl git-lfs dos2unix python3 make g++

# Use production env so app behaves like real deployment
ENV NODE_ENV=production

# Copy only what's needed first
COPY package*.json ./

# Install *all* dependencies, including dev ones 
# but preserve NODE_ENV=production for app logic
RUN npm ci --include=dev

# Copy build output (compiled code) and tests
COPY --from=builder /app/dist ./dist
COPY --from=builder /usr/local/bin/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ./tests ./tests
COPY tsconfig.json ./

RUN chmod +x /usr/local/bin/entrypoint.sh

# Default command runs tests in production context
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npx", "jest", "--verbose", "--runInBand"]