# Docker Deployment Design — Laboratory Management System

**Date:** 2026-05-11
**Target:** Linux VM at `10.4.89.165` (SSH as `web`)
**Approach:** Docker Compose with Nginx (Option A)

---

## Architecture

Two containers on a shared internal Docker network:

- **backend** — Node.js 20 + Express API, internal port 3000, never exposed publicly
- **frontend** — Nginx serving the Vite-built React SPA on port 80; proxies `/api`, `/socket.io`, and `/uploads` to the backend container

MongoDB stays on Atlas (cloud-hosted). No local database container.

```
Internet → VM:80 → [frontend/Nginx]
                        ├── /          → serves dist/index.html (React SPA)
                        ├── /api       → http://backend:3000
                        ├── /socket.io → http://backend:3000 (WebSocket upgrade)
                        └── /uploads   → http://backend:3000
```

---

## Files to Create

```
LaboratoryManagementSystem/
├── docker-compose.yml
├── backend/
│   └── Dockerfile
└── front/
    ├── Dockerfile
    └── nginx.conf
```

No existing files are modified.

---

## backend/Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

- `node:20-alpine` — small production image
- `npm ci --omit=dev` — excludes nodemon and other dev dependencies
- Entry point is `server.js` (matches `package.json` `start` script)

---

## front/Dockerfile (multi-stage)

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN VITE_API_URL=/api npm run build

# Stage 2: serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`VITE_API_URL=/api` at build time ensures all API calls use a relative path. Nginx resolves them to the backend container — no host is hardcoded in the JS bundle.

---

## front/nginx.conf

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /uploads {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
    }
}
```

---

## docker-compose.yml

```yaml
services:
  backend:
    build: ./backend
    env_file: ./backend/.env
    volumes:
      - uploads_data:/app/uploads
    restart: unless-stopped
    networks:
      - app-network

  frontend:
    build: ./front
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - app-network

volumes:
  uploads_data:

networks:
  app-network:
```

- Only port 80 is exposed; backend is reachable only inside the Docker network
- `uploads_data` named volume persists uploaded files across container rebuilds
- `env_file: ./backend/.env` — secrets are managed by manually placing `.env` on the VM

---

## Backend .env changes for production

When deploying, update `backend/.env` on the VM:

```
NODE_ENV=production
CORS_ORIGIN=http://10.4.89.165
TRUST_PROXY=1
ENABLE_DEV_EMAIL_BYPASS=false
ADMIN_EMAIL=your-admin@its.ac.id
ADMIN_PASSWORD=StrongPassword123!
```

`CORS_ORIGIN` must match the host users will use to access the app. Since Nginx proxies all requests from the same origin, the backend sees requests from the Nginx container — CORS_ORIGIN should be set to the VM's IP or domain.

---

## Deployment Workflow

```bash
# On your local machine — copy .env to VM
scp backend/.env web@10.4.89.165:~/LaboratoryManagementSystem/backend/.env

# On the VM
git clone <repo-url> ~/LaboratoryManagementSystem
cd ~/LaboratoryManagementSystem

# Edit .env for production values
nano backend/.env

# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Restart a single service after code change
docker compose up -d --build backend
```

---

## Data Persistence

| Data | Where stored | Survives rebuild? |
|------|-------------|-------------------|
| MongoDB documents | Atlas (cloud) | Yes |
| Uploaded files (`/uploads`) | `uploads_data` Docker volume | Yes |
| JWT secrets / config | `backend/.env` on VM filesystem | Yes (manual) |

---

## Out of Scope

- HTTPS / TLS (can be added later with Certbot + Nginx)
- CI/CD pipeline
- Horizontal scaling / load balancing
