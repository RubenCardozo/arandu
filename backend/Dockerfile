# Use Node.js 20 Alpine as the lightweight base image
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for NestJS compilation)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Compile TypeScript code to production-ready JavaScript in dist/
RUN npm run build

# ==============================================================================
# Production Stage
# ==============================================================================
FROM node:20-alpine AS production

# Set working directory inside the container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install only production dependencies for a lightweight image
RUN npm ci --only=production

# Copy compiled JavaScript output from the builder stage
COPY --from=builder /app/dist ./dist

# Explicitly document and expose port 3000 for Coolify / production deployment
EXPOSE 3000

# Set the start command to launch the NestJS application
CMD ["node", "dist/main.js"]
