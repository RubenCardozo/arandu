# Stage 1: Build Angular static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared folder required for @arandu/types
COPY shared ./shared
COPY frontend-public/package.json frontend-public/package-lock.json ./frontend-public/

WORKDIR /app/frontend-public
RUN npm ci

COPY frontend-public ./
RUN npm run build

# Stage 2: Serve static files via Nginx
FROM nginx:alpine AS production

COPY --from=builder /app/frontend-public/dist/frontend-public/browser /usr/share/nginx/html
COPY frontend-public/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
