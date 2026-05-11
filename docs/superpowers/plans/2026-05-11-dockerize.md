# Dockerize Laboratory Management System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the React + Node.js/Express app into two Docker containers (Nginx frontend + Node backend) orchestrated by Docker Compose for deployment to a Linux VM.

**Architecture:** Nginx container serves the Vite-built React SPA on port 80 and reverse-proxies `/api`, `/socket.io`, and `/uploads` to the Node.js backend container on the internal Docker network. The backend reads secrets from a `backend/.env` file placed manually on the VM. MongoDB stays on Atlas.

**Tech Stack:** Docker, Docker Compose, Node.js 20 Alpine, Nginx Alpine, Vite (build-time env injection)

---

## Files to Create

| File | Purpose |
|------|---------|
| `backend/.dockerignore` | Exclude `node_modules`, `uploads`, `.env` from build context |
| `backend/Dockerfile` | Node.js 20 Alpine production image |
| `front/.dockerignore` | Exclude `node_modules`, `dist` from build context |
| `front/nginx.conf` | Nginx: serve SPA + proxy `/api`, `/socket.io`, `/uploads` |
| `front/Dockerfile` | Multi-stage: Vite build → Nginx Alpine serve |
| `docker-compose.yml` | Orchestrate both services, named volume, shared network |

No existing files are modified.

---

## Task 1: Backend .dockerignore

**Files:**
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create `backend/.dockerignore`**

```
node_modules
npm-debug.log
.env
uploads
*.md
.git
```

> Excluding `node_modules` keeps the build context small (avoids copying hundreds of MB). Excluding `uploads` prevents local test files from leaking into the image — uploads are handled by a Docker volume at runtime. Excluding `.env` ensures secrets are never baked into the image.

- [ ] **Step 2: Commit**

```bash
git add backend/.dockerignore
git commit -m "chore: add backend .dockerignore"
```

---

## Task 2: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

> `npm ci --omit=dev` installs only production dependencies — nodemon and other dev tools are excluded, keeping the image lean.

- [ ] **Step 2: Verify the image builds (run from repo root)**

```bash
docker build -t lab-backend ./backend
```

Expected output ends with:
```
Successfully tagged lab-backend:latest
```
No errors about missing files or failed npm installs.

- [ ] **Step 3: Verify the image starts (requires a reachable MongoDB URI)**

```bash
docker run --rm -p 3000:3000 \
  --env-file ./backend/.env \
  lab-backend
```

Expected log line: `🚀 Server running on port 3000 in development mode`

Press `Ctrl+C` to stop. If MongoDB Atlas URI in `.env` is unreachable from your machine this step may show a connection error — that is OK at this stage; the image itself is correct.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile
git commit -m "chore: add backend Dockerfile"
```

---

## Task 3: Frontend .dockerignore

**Files:**
- Create: `front/.dockerignore`

- [ ] **Step 1: Create `front/.dockerignore`**

```
node_modules
dist
npm-debug.log
.env*
```

> Excluding `node_modules` and `dist` means the Docker build always does a clean install and build inside the container — local build artifacts never interfere.

- [ ] **Step 2: Commit**

```bash
git add front/.dockerignore
git commit -m "chore: add frontend .dockerignore"
```

---

## Task 4: Nginx config

**Files:**
- Create: `front/nginx.conf`

- [ ] **Step 1: Create `front/nginx.conf`**

```nginx
server {
    listen 80;

    # Serve React SPA — unknown paths fall back to index.html for client-side routing
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy REST API calls to backend container
    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy Socket.io — must upgrade HTTP → WebSocket
    location /socket.io {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy uploaded file assets (images, PDFs stored in backend/uploads)
    location /uploads {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
    }
}
```

> `try_files $uri $uri/ /index.html` is required for React Router — without it, refreshing on any sub-route returns a 404 from Nginx.

- [ ] **Step 2: Commit**

```bash
git add front/nginx.conf
git commit -m "chore: add Nginx config for SPA and API proxy"
```

---

## Task 5: Frontend Dockerfile

**Files:**
- Create: `front/Dockerfile`

- [ ] **Step 1: Create `front/Dockerfile`**

```dockerfile
# ── Stage 1: build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN VITE_API_URL=/api npm run build

# ── Stage 2: serve ──────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

> `VITE_API_URL=/api` is set at build time. Vite bakes this value into the JS bundle. Because it is a relative path (`/api`), the browser sends requests to the same host that served the page — Nginx intercepts them and proxies to the backend. No IP address or port is hardcoded in the bundle.

- [ ] **Step 2: Verify the image builds**

```bash
docker build -t lab-frontend ./front
```

Expected output ends with:
```
Successfully tagged lab-frontend:latest
```
Look for `vite build` completing successfully in the build output (the builder stage logs `dist/` file sizes).

- [ ] **Step 3: Spot-check the built bundle has the correct API path**

```bash
docker run --rm lab-frontend \
  grep -r "localhost:3000" /usr/share/nginx/html
```

Expected: **no output** (the hardcoded localhost URL must not appear in the bundle — it should be `/api` instead).

- [ ] **Step 4: Commit**

```bash
git add front/Dockerfile
git commit -m "chore: add multi-stage frontend Dockerfile"
```

---

## Task 6: docker-compose.yml

**Files:**
- Create: `docker-compose.yml` (repo root)

- [ ] **Step 1: Create `docker-compose.yml` at the repo root**

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

> Only port 80 is published to the host. The backend is reachable only via the internal `app-network` — it is never directly accessible from the internet. The `uploads_data` named volume survives `docker compose down` and `--build` rebuilds.

- [ ] **Step 2: Full stack smoke test — build and start both containers**

```bash
docker compose up --build -d
```

Expected: both `backend` and `frontend` containers reach `running` state.

- [ ] **Step 3: Verify backend health endpoint is reachable through Nginx**

```bash
curl http://localhost/api/health
```

Expected response:
```json
{"status":"OK","timestamp":"..."}
```

- [ ] **Step 4: Verify frontend is served**

```bash
curl -s http://localhost | grep -o "<title>.*</title>"
```

Expected: prints the app's `<title>` tag (e.g. `<title>Lab Management</title>`). Any non-empty HTML title is a pass.

- [ ] **Step 5: Check container logs for errors**

```bash
docker compose logs backend --tail 30
docker compose logs frontend --tail 30
```

Expected: no `ERROR` lines. Backend should show `✅ MongoDB connected successfully` and `🚀 Server running on port 3000`.

- [ ] **Step 6: Stop containers**

```bash
docker compose down
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add docker-compose.yml for production deployment"
```

---

## Task 7: Update backend/.env for production (VM only — do not commit)

This task is performed **on the VM** after pushing the code. No file is committed to git.

- [ ] **Step 1: Push the code to the remote repo**

```bash
git push origin main
```

- [ ] **Step 2: SSH into the VM and clone the repo**

```bash
ssh web@10.4.89.165
git clone <your-repo-url> ~/LaboratoryManagementSystem
cd ~/LaboratoryManagementSystem
```

- [ ] **Step 3: Copy the local `.env` to the VM** (run from your local machine in a separate terminal)

```bash
scp backend/.env web@10.4.89.165:~/LaboratoryManagementSystem/backend/.env
```

- [ ] **Step 4: On the VM, edit `.env` for production values**

```bash
nano ~/LaboratoryManagementSystem/backend/.env
```

Change or add these lines:

```
NODE_ENV=production
CORS_ORIGIN=http://10.4.89.165
TRUST_PROXY=1
ENABLE_DEV_EMAIL_BYPASS=false
ADMIN_EMAIL=your-admin@its.ac.id
ADMIN_PASSWORD=YourStrongPassword123!
```

> `CORS_ORIGIN` must match the origin that browsers will use. Since Nginx proxies API calls from the same host, the browser sends `Origin: http://10.4.89.165` — the backend must allow it.
> `TRUST_PROXY=1` tells Express to trust the `X-Forwarded-For` header set by Nginx.

- [ ] **Step 5: On the VM, build and start the stack**

```bash
cd ~/LaboratoryManagementSystem
docker compose up --build -d
```

- [ ] **Step 6: Verify the deployment from your local machine**

```bash
curl http://10.4.89.165/api/health
```

Expected:
```json
{"status":"OK","timestamp":"..."}
```

Open `http://10.4.89.165` in a browser — the login page should load.

- [ ] **Step 7: Tail logs to confirm no errors**

```bash
# On the VM
docker compose logs -f
```

Expected: `✅ MongoDB connected successfully`, `🚀 Server running on port 3000 in production mode`. No `FATAL` or `ERROR` lines.

---

## Quick Reference — Common Commands on the VM

```bash
# Rebuild and restart after a code change
git pull && docker compose up --build -d

# View live logs
docker compose logs -f

# Restart one service without rebuilding
docker compose restart backend

# Check running containers
docker compose ps

# Stop everything (volumes are preserved)
docker compose down

# Stop and delete volumes (WARNING: deletes uploaded files)
docker compose down -v
```
