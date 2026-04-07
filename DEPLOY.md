# Deployment Guide — Про Запас

## Overview

This guide covers deploying Про Запас to a VPS using Docker Compose with PostgreSQL.

### Architecture

```
User → Port 80 (nginx) → Frontend (React SPA)
                     → /api/* → Backend (FastAPI)
                     → /health → Backend
                     
Backend → PostgreSQL (Port 5432)
```

## Prerequisites

- VPS with Ubuntu 22.04+ (or similar Linux distro)
- Docker & Docker Compose installed
- Domain name (optional but recommended)
- Basic terminal/SSH knowledge

---

## 1. VPS Setup

### 1.1 Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (optional)
sudo usermod -aG docker $USER

# Docker Compose is included with Docker (v23+)
docker compose version
```

### 1.2 Clone Your Repository

```bash
git clone <your-repo-url> prozapas
cd prozapas
```

---

## 2. Configuration

### 2.1 Generate SECRET_KEY

```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6... (64 characters)
```

### 2.2 Create .env File

```bash
cp .env.example .env
nano .env
```

Edit the values:

```env
# JWT Secret Key (use the one you generated)
SECRET_KEY=a1b2c3d4e5f6... # 64-char hex string

# Database URL (PostgreSQL)
DATABASE_URL=postgresql+psycopg2://prozapas:prozapspassword@db:5432/prozapas

# CORS Origins (your production domain)
CORS_ORIGINS=https://yourdomain.com,http://yourdomain.com
```

### 2.3 Update docker-compose.yml

Edit the PostgreSQL password if you changed it:

```bash
nano docker-compose.yml
```

Make sure the password in `db.environment` matches `backend.environment.DATABASE_URL`.

---

## 3. First Deployment

### 3.1 Build & Start

```bash
cd /path/to/prozapas
docker compose up -d --build
```

This will:
1. Build the backend image (Python + FastAPI)
2. Build the frontend image (React → nginx)
3. Start PostgreSQL container
4. Run all 3 services

### 3.2 Check Status

```bash
# View all containers
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### 3.3 Verify

```bash
# Check backend health
curl http://localhost/health

# Check frontend
curl http://localhost/

# Check API docs
curl http://localhost/api/docs
```

---

## 4. Initialize Database

### 4.1 Run Seed Script (Optional)

```bash
# Enter backend container
docker compose exec backend bash

# Run seed
python seed.py

# Exit
exit
```

### 4.2 Create First User

Use the API docs at `http://your-server-ip/api/docs` to register via Swagger UI, or:

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "securepassword"}'
```

---

## 5. HTTPS with Let's Encrypt (When You Get a Domain)

### Current Setup: HTTP Only

Right now your app runs via **HTTP** on port 80:
```
http://YOUR_VPS_IP
```

This works fine for testing without a domain!

### When You Get a Domain

Once you have a domain, you can add HTTPS using one of these options:

#### Option A: Cloudflare Tunnel (Free, No DNS Setup)

Cloudflare gives you a free HTTPS URL like `yourname.trycloudflare.com`:

1. Install `cloudflared` on your VPS:
```bash
# Ubuntu/Debian
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

2. Create tunnel (no account needed for quick tunnels):
```bash
cloudflared tunnel --url http://localhost:80
```

3. You'll get a public HTTPS URL like: `https://abc123.trycloudflare.com`

For permanent setup with account, see [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).

#### Option B: Caddy (Automatic HTTPS with Domain)

If you have a domain pointing to your VPS:

1. Add to `docker-compose.yml`:
```yaml
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

volumes:
  caddy_data:
  caddy_config:
```

2. Create `Caddyfile`:
```
yourdomain.com {
    reverse_proxy frontend:80
}
```

3. Redeploy: `docker compose up -d --build`

Caddy automatically obtains and renews Let's Encrypt certificates!

#### Option C: Certbot (Manual Certificates)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Set up auto-renewal
sudo certbot renew --dry-run
```

---

## 6. Maintenance

### 6.1 Update Application

```bash
cd /path/to/prozapas
git pull
docker compose down
docker compose up -d --build
```

### 6.2 Backup Database

```bash
# Backup
docker compose exec db pg_dump -U prozapas prozapas > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup.sql | docker compose exec -T db psql -U prozapas prozapas
```

### 6.3 View Logs

```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100 backend

# Follow logs
docker compose logs -f backend
```

### 6.4 Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### 6.5 Database Management

```bash
# Connect to PostgreSQL
docker compose exec db psql -U prozapas

# List tables
\dt

# View users
SELECT id, email, created_at FROM "user";

# Exit
\q
```

---

## 7. Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - Wrong DATABASE_URL format
# - PostgreSQL not ready yet (check depends_on)
# - Missing SECRET_KEY
```

### Frontend can't reach API

```bash
# Check nginx config
docker compose exec frontend cat /etc/nginx/conf.d/default.conf

# Test connectivity
docker compose exec frontend wget -qO- http://backend:8000/health
```

### Database connection issues

```bash
# Check if DB is running
docker compose exec db pg_isready -U prozapas

# Check environment variables
docker compose exec backend env | grep DATABASE_URL
```

### Reset Everything

```bash
# Stop & remove everything (INCLUDING DATA)
docker compose down -v

# Rebuild & start
docker compose up -d --build
```

---

## 8. Production Checklist

- [ ] Changed `SECRET_KEY` to a random 64+ character string
- [ ] Changed PostgreSQL password from default
- [ ] Set `CORS_ORIGINS` to your production domain (if applicable)
- [ ] Set up automatic backups
- [ ] Set up monitoring (optional: Uptime Kuma, Grafana)
- [ ] Removed `seed.py` from production (or added flag)
- [ ] Configured firewall (ufw allow 80, 443, 22)
- [ ] Set up SSH key authentication
- [ ] Disabled root SSH login
- [ ] (Optional) Get a domain and set up HTTPS

---

## 9. Environment Variables Reference

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT signing key | `prozapas-dev-secret-key-change-in-production` |
| `DATABASE_URL` | Database connection string | `sqlite:///./prozapas.db` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

---

## 10. Useful Commands

```bash
# Enter backend shell
docker compose exec backend bash

# Enter database shell
docker compose exec db psql -U prozapas

# Rebuild single service
docker compose build backend
docker compose up -d backend

# Check resource usage
docker stats

# Prune unused images/volumes
docker system prune -a
docker volume prune
```

---

## 11. Scaling (Optional)

For higher traffic, you can:

1. **Increase backend workers** — edit `Dockerfile`:
```dockerfile
CMD gunicorn main:app \
    --workers 8 \  # Increase from 4
    ...
```

2. **Add Redis caching** — add to `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  volumes:
    - redis_data:/data
```

3. **Use connection pooling** — add PgBouncer for high-DB-load scenarios

---

## Support

For issues, check:
1. `docker compose logs -f` for error messages
2. API docs at `/api/docs` for endpoint testing
3. PostgreSQL logs for database issues
4. nginx config for routing problems
