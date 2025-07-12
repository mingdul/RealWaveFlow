# Build stage
FROM node:18 as build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build with environment variables
ARG VITE_API_URL=http://13.125.231.115:8080
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# List build output for debugging
RUN ls -la dist/
RUN ls -la dist/assets/ || echo "No assets directory"

# Production stage
FROM nginx:stable-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Verify files are copied correctly
RUN ls -la /usr/share/nginx/html/
RUN ls -la /usr/share/nginx/html/assets/ || echo "No assets directory in final image"

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
