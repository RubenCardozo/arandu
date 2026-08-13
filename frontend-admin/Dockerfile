# Stage 1: Build Angular static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared folder required for @arandu/types
COPY shared ./shared
COPY frontend-admin/package.json frontend-admin/package-lock.json ./frontend-admin/

WORKDIR /app/frontend-admin
RUN npm ci

COPY frontend-admin ./
RUN npm run build

# Stage 2: Serve static files via Nginx
FROM nginx:alpine AS production

COPY --from=builder /app/frontend-admin/dist/frontend-admin/browser /usr/share/nginx/html
COPY frontend-admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
