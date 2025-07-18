FROM node:18

WORKDIR /app

# Install curl for health checks and node-polyfill-webpack-plugin for crypto support
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install crypto --save || true

# 정적 파일 복사 (public/assets)
COPY ./public ./public

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ && echo "Build completed successfully..."

# Start the application with NODE_OPTIONS to enable crypto
ENV NODE_OPTIONS="--require crypto"

# Start the application
CMD ["node", "dist/main.js"]

EXPOSE 3000
