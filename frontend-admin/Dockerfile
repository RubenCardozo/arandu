# Stage 1: Build Angular static assets
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve static files via Nginx
FROM nginx:alpine AS production

COPY --from=builder /app/dist/frontend-admin/browser /usr/share/nginx/html

RUN echo $'server {\n\
    listen 80;\n\
    server_name _;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
