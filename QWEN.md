# Про Запас — QWEN.md

## Project Overview

**Про Запас** is an inventory management application for household items and consumables across various spaces (home, office, car, garage, dacha, etc.). The project consists of a FastAPI backend and a React + TypeScript frontend.

### Architecture

- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, SQLite (dev) / PostgreSQL (prod)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Query, Chart.js
- **Authentication:** JWT (python-jose), bcrypt hashing (passlib)
- **WebSockets:** Real-time presence tracking via `presence.py`
- **Deployment:** Docker Compose with nginx, gunicorn, PostgreSQL

### Key Features

- User registration and authentication (JWT tokens, 7-day lifetime)
- Multi-space support (Spaces) — home, office, car, garage, etc.
- CRUD operations for Items linked to spaces
- Invite system for collaborative space access
- User roles: `owner` / `member`
- Quantity operations: `add`, `consume`, `bulk_update`
- Low stock tracking (quantity <= min_quantity)
- Quantity history tracking (QuantitySnapshot model)
- Real-time presence tracking via WebSockets
- Seed script with realistic data (Faker, ~40+ item categories)
- PWA support (Progressive Web App)

## Directory Structure

```
prozapas/
├── main.py              # FastAPI entry point, router registration
├── models.py            # SQLAlchemy models (User, Space, Membership, Invite, Item, QuantitySnapshot)
├── schemas.py           # Pydantic schemas for validation and serialization
├── database.py          # DB engine, session, Base
├── crud.py              # CRUD operations for Items
├── auth_config.py       # JWT configuration (SECRET_KEY, ALGORITHM)
├── auth_utils.py        # Utilities: hash_password, verify_password, create/decode token
├── dependencies.py      # FastAPI dependencies: get_current_user, require_membership
├── presence.py          # WebSocket presence manager for real-time user tracking
├── seed.py              # Test data generation via Faker
├── test_auth.py         # Authentication tests
├── requirements.txt     # Python dependencies
├── docker-compose.yml   # Docker Compose configuration (PostgreSQL, backend, frontend)
├── Dockerfile           # Backend Docker image (gunicorn + uvicorn workers)
├── routes/              # API routers
│   ├── __init__.py
│   ├── auth.py          # /api/auth/register, /login, /me
│   ├── spaces.py        # /api/spaces, /invites
│   ├── items.py         # /api/spaces/{space_id}/items
│   └── websocket.py     # WebSocket endpoint for presence tracking
└── frontend/            # React frontend (Vite + TypeScript)
    ├── src/
    │   ├── api/         # API client modules
    │   ├── components/  # Reusable UI components
    │   ├── context/     # React context providers (Auth, Spaces)
    │   ├── pages/       # Page components
    │   ├── App.tsx      # Main app component with routing
    │   ├── main.tsx     # Entry point
    │   └── index.css    # Global styles
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

## Database Models

### User
- `id`, `email` (unique, indexed), `hashed_password`, `created_at`
- Relationships: `memberships`, `created_invites`

### Space
- `id`, `name`, `description`, `created_by` (FK → User), `created_at`
- Relationships: `owner`, `memberships`, `items`, `invites`

### Membership
- `id`, `user_id`, `space_id`, `role` (owner/member), `joined_at`
- Relationships: `user`, `space`
- Unique constraint: `(user_id, space_id)`

### Invite
- `id`, `space_id`, `token` (unique, indexed), `created_by`, `expires_at`, `used`, `created_at`
- Relationships: `space`, `creator`

### Item
- `id`, `name` (indexed), `quantity`, `unit`, `min_quantity`, `location`, `is_consumable`, `space_id` (nullable), `created_at`, `updated_at`
- Relationships: `space`, `quantity_history`

### QuantitySnapshot
- `id`, `item_id`, `quantity`, `change_type` (add/consume/update/create), `recorded_at`
- Relationships: `item`

## Building and Running

### Backend (Development)

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Generate test data
python seed.py
```

Server available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend (Development)

```bash
cd frontend

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Frontend available at `http://localhost:5173`.

### Docker Compose (Production)

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Check backend health
curl http://localhost/health
```

### Default Credentials

| Email | Password |
|-------|----------|
| demo@prozapas.local | demo |
| (auto-generated users) | password123 |

## API Endpoints

### Auth (`/api/auth`)
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login, returns JWT token
- `GET /api/auth/me` — Get current user (requires Bearer token)

### Spaces (`/api`)
- `GET /api/spaces` — List user's spaces
- `POST /api/spaces` — Create new space
- `GET /api/spaces/{space_id}` — Space details with members
- `PUT /api/spaces/{space_id}` — Update space (owner only)
- `DELETE /api/spaces/{space_id}` — Delete space (owner only)
- `GET /api/spaces/{space_id}/stats` — Space statistics with low stock info
- `POST /api/spaces/{space_id}/invite` — Create invite (48h expiry)
- `GET /api/invites/{token}` — Accept invite

### Items (context of space)
- `GET /api/spaces/{space_id}/items` — List items (`?low_stock=true` for low stock only)
- `GET /api/spaces/{space_id}/items/{item_id}` — Single item
- `POST /api/spaces/{space_id}/items` — Create item
- `PUT /api/spaces/{space_id}/items/{item_id}` — Update item
- `DELETE /api/spaces/{space_id}/items/{item_id}` — Delete item
- `PATCH /api/spaces/{space_id}/items/bulk` — Bulk quantity update
- `POST /api/spaces/{space_id}/items/{item_id}/add` — Add quantity
- `POST /api/spaces/{space_id}/items/{item_id}/consume` — Consume quantity

### WebSocket (presence)
- `WS /api/ws/{space_id}` — Real-time presence tracking

## Development Conventions

- **Pydantic v2** style: `from_attributes = True` instead of `orm_mode`
- **SQLAlchemy 2.0**: declarative_base, relationships with `back_populates`
- **CORS**: allows origin `http://localhost:5173` (Vite dev server)
- **JWT**: `sub` claim must be a string (python-jose requirement)
- **SQLite**: `check_same_thread=False` for multi-threaded access
- **Frontend**: TypeScript strict mode, React Query for data fetching, Tailwind CSS for styling
- **Quantity validation**: consumption validates that result won't be negative
- **Computed fields**: `low_stock` is computed at serialization time, not stored in DB

## Key Configuration

### Environment Variables

| Variable | Description | Default (dev) |
|----------|-------------|---------------|
| `SECRET_KEY` | JWT signing key | `prozapas-dev-secret-key-change-in-production` |
| `DATABASE_URL` | Database connection string | `sqlite:///./prozapas.db` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |

### JWT Configuration

- **Algorithm:** HS256
- **ACCESS_TOKEN_EXPIRE_MINUTES:** 10080 (7 days)

## Frontend Architecture

### Routing (React Router v7)

| Path | Component | Auth |
|------|-----------|------|
| `/login` | Login | No |
| `/register` | Register | No |
| `/invite/:token` | AcceptInvite | Both |
| `/` | Redirect → `/space/{first_id}/items` | Yes |
| `/space/:id/items` | Items | Yes |
| `/space/:id/low-stock` | LowStock | Yes |
| `/space/:id/settings` | SpaceSettings | Yes |

### State Management

| Layer | Tool | Purpose |
|-------|------|---------|
| Server state | React Query | Items, spaces, user, item history |
| Auth state | React Context + localStorage | User info, JWT token |
| Spaces state | React Context (SpacesContext) | List of spaces, active space |
| UI state | `useState` | Modals, forms, filters |

### React Query Configuration
- `staleTime: 30s`
- `retry: false`
- Manual query invalidation in mutation `onSuccess` callbacks

## Deployment

### Architecture

```
User → Port 80 (nginx) → Frontend (React SPA)
                     → /api/* → Backend (FastAPI)
                     → /health → Backend

Backend → PostgreSQL (Port 5432)
```

### Production Checklist

- [ ] Changed `SECRET_KEY` to a random 64+ character string
- [ ] Changed PostgreSQL password from default
- [ ] Set `CORS_ORIGINS` to your production domain
- [ ] Set up automatic backups
- [ ] Configured firewall (ufw allow 80, 443, 22)
- [ ] Set up HTTPS (Cloudflare Tunnel, Caddy, or Certbot)

See `DEPLOY.md` for detailed deployment instructions.

## Key Design Decisions

1. **Single active space:** `useActiveSpace()` always returns `spaces[0]` — no space switcher, user's first space is the context
2. **Token in localStorage:** Not httpOnly cookie — suitable for MVP but needs upgrade for production
3. **No CORS in dev:** Vite proxy eliminates CORS issues during development
4. **All UI in Russian:** Frontend text is localized to Russian
5. **No auto-retry:** React Query `retry: false` — failures are immediate, user must manually retry
6. **Computed low_stock:** Not stored in DB, calculated at serialization time (`quantity <= min_quantity`)
7. **Space auto-creation on register:** Registration auto-creates a "Home" space via backend
8. **Cascade deletes:** Space deletion removes all related memberships, items, and invites
9. **WebSocket presence:** Real-time tracking of online users per space
