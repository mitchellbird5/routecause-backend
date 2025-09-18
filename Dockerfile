# ============================
# Stage 1: Builder
# ============================
FROM node:22-alpine AS builder
WORKDIR /app

# Install necessary tools
RUN apk add --no-cache bash git curl

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY ./src ./src
COPY tsconfig.json ./

# Build the project
RUN npm run build

# ============================
# Stage 2: Dev runtime
# ============================
FROM node:22-alpine AS debug-runtime
WORKDIR /app

# Install necessary tools
RUN apk add --no-cache bash git curl

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy package.json and source code
COPY package*.json ./
COPY ./src ./src
COPY tsconfig.json ./

# Set ownership to the existing 'node' user
RUN chown -R node:node /app /app/node_modules

# Create a volume for your project folder
VOLUME ["/app"]

# Switch to the node user
USER node

# Default dev command
CMD ["npm", "run", "dev"]

