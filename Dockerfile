# ============================
# Stage 1: Builder
# ============================
FROM node:22-alpine AS builder
WORKDIR /app

# Install bash/git/curl (optional)
RUN apk add --no-cache bash git curl

# Copy package.json first (leverage Docker cache)
COPY package.json ./
COPY package-lock.json ./

# Install dependencies inside container
RUN npm install

# Copy source code
COPY ./src ./src
COPY tsconfig.json ./

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]

# Expose port for development
# EXPOSE 3000

# Default command for dev
CMD ["npm", "run", "dev"]
