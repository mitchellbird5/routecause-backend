# ============================
# Stage 1: Builder
# ============================
FROM node:22-alpine AS builder
WORKDIR /app

# Install bash/git/curl (optional)
RUN apk add --no-cache bash git curl git-lfs dos2unix

# Copy package.json first (leverage Docker cache)
COPY package.json ./
COPY package-lock.json ./

# Install dependencies inside container
RUN npm install

# Copy source code
COPY ./src ./src
COPY tsconfig.json ./

# Copy tests for CI
COPY jest.config.js ./
COPY ./tests ./tests

# Copy entrypoint script
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN dos2unix /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command for dev
CMD ["npm", "run", "dev"]
