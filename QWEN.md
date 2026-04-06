# Про Запас — QWEN.md

## Project Overview

**Про Запас** is an inventory management application for household items and consumables across various spaces (home, office, car, garage, dacha, etc.). The project consists of a FastAPI backend and a React + TypeScript frontend.

### Architecture

- **Backend:** Python 3.9+, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Query, Chart.js
- **Authentication:** JWT (python-jose), bcrypt hashing (passlib)
- **Database:** SQLite (`prozapas.db`)

### Key Features

- User registration and authentication (JWT tokens, 7-day lifetime)
- Multi-space support (Spaces) — home, office, car, garage, etc.
- CRUD operations for Items linked to spaces
- Invite system for collaborative space access
- User roles: `owner` / `member`
- Quantity operations: `add`, `consume`, `bulk_update`
- Low stock tracking (quantity <= min_quantity)
- Quantity history tracking (QuantitySnapshot model)
- Seed script with realistic data (Faker, ~40+ item categories)

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
├── seed.py              # Test data generation via Faker
├── test_auth.py         # Authentication tests
├── requirements.txt     # Python dependencies
├── routes/              # API routers
│   ├── __init__.py
│   ├── auth.py          # /api/auth/register, /login, /me
│   ├── spaces.py        # /api/spaces, /invites
│   └── items.py         # /api/spaces/{space_id}/items
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

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Generate test data
python seed.py
```

Server available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### Frontend

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
- `DELETE /api/spaces/{space_id}` — Delete space (owner only)
- `DELETE /api/spaces/{space_id}/members/{user_id}` — Remove member (owner only)
- `DELETE /api/spaces/{space_id}/leave` — Leave space (not for owners)
- `POST /api/spaces/{space_id}/invites` — Create invite (48h expiry)
- `GET /api/invites/{token}` — Accept invite

### Items (context of space)
- `GET /api/spaces/{space_id}/items` — List items
- `GET /api/spaces/{space_id}/items/{item_id}` — Single item
- `POST /api/spaces/{space_id}/items` — Create item
- `PUT /api/spaces/{space_id}/items/{item_id}` — Update item
- `DELETE /api/spaces/{space_id}/items/{item_id}` — Delete item
- `PATCH /api/spaces/{space_id}/items/bulk` — Bulk quantity update
- `POST /api/spaces/{space_id}/items/{item_id}/add` — Add quantity
- `POST /api/spaces/{space_id}/items/{item_id}/consume` — Consume quantity

## Development Conventions

- **Pydantic v2** style: `from_attributes = True` instead of `orm_mode`
- **SQLAlchemy 2.0**: declarative_base, relationships with `back_populates`
- **CORS**: allows origin `http://localhost:5173` (Vite dev server)
- **JWT**: `sub` claim must be a string (python-jose requirement)
- **SQLite**: `check_same_thread=False` for multi-threaded access
- **Frontend**: TypeScript strict mode, React Query for data fetching, Tailwind CSS for styling

## Key Configuration

- **SECRET_KEY:** `"prozapas-dev-secret-key-change-in-production"` (⚠️ must be changed for production)
- **ALGORITHM:** `HS256`
- **ACCESS_TOKEN_EXPIRE_MINUTES:** 10080 (7 days)
- **Database URL:** `sqlite:///./prozapas.db`
- **CORS Origin:** `http://localhost:5173`

## Frontend Structure

### Pages
- **Login/Register** — Authentication flows
- **Items** — Main item list per space
- **LowStock** — Items with quantity below minimum
- **SpaceSettings** — Space configuration and member management
- **AcceptInvite** — Invite acceptance page

### Context Providers
- **AuthContext** — User authentication state
- **SpacesContext** — Space data and selection

### Key Components
- **SpaceLayout** — Layout wrapper for space-specific pages with sidebar navigation
- **ProtectedRoute** — Route guard for authenticated access
- **EmptyState** — Shown when user has no spaces
