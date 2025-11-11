# ============================
# Stage 1: Base builder
# ============================
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache bash git curl git-lfs dos2unix

COPY package*.json ./
RUN npm install

COPY ./src ./src
COPY tsconfig.json ./
COPY jest.config.js ./
COPY ./tests ./tests
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN dos2unix /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

# Build the app for production
RUN npm run build

# ============================
# Stage 3: Production
# ============================
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache bash curl

# Copy only necessary files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /usr/local/bin/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/api/server.js"]