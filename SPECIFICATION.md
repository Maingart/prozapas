# Про Запас — Project Specification

## 1. Overview

**Про Запас** is a household inventory management application for tracking items and consumables across multiple spaces (home, office, car, garage, dacha, etc.).

### Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.9+, FastAPI, SQLAlchemy 2.0, SQLite |
| **Frontend** | React 18, TypeScript, Vite, React Router v7, React Query, Chart.js, Tailwind CSS |
| **Auth** | JWT (python-jose, HS256, 7-day expiry), bcrypt (passlib) |
| **Dev Proxy** | Vite proxies `/api` → `http://localhost:8000` |

---

## 2. Database Models

### User

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | PK |
| `email` | String(255) | Unique, indexed, not null |
| `hashed_password` | String(255) | Not null |
| `created_at` | DateTime | Not null, default=utcnow |

**Relationships:** `spaces` (owned), `memberships`, `created_invites`

### Space

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | PK |
| `name` | String(255) | Not null |
| `description` | String(1000) | Nullable |
| `created_by` | Integer | FK → User.id, not null |
| `created_at` | DateTime | Not null, default=utcnow |

**Relationships:** `owner` (User), `memberships` (cascade delete), `items` (cascade delete), `invites` (cascade delete)

### Membership

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | PK |
| `user_id` | Integer | FK → User.id, not null |
| `space_id` | Integer | FK → Space.id, not null |
| `role` | String(20) | `"owner"` or `"member"`, default=`"member"` |
| `joined_at` | DateTime | Not null, default=utcnow |

**Unique constraint:** `(user_id, space_id)`

### Invite

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | PK |
| `space_id` | Integer | FK → Space.id, not null |
| `token` | String(64) | Unique, indexed, not null |
| `created_by` | Integer | FK → User.id, not null |
| `expires_at` | DateTime | Not null |
| `used` | Boolean | Default=False |
| `created_at` | DateTime | Not null, default=utcnow |

### Item

| Field | Type | Notes |
|---|---|---|
| `id` | Integer | PK |
| `name` | String(255) | Not null |
| `quantity` | Float | Not null, default=0 |
| `unit` | String(50) | Nullable (e.g. "шт", "л") |
| `min_quantity` | Float | Not null, default=0 — threshold for low-stock alerts |
| `location` | String(255) | Nullable (e.g. "кухня, шкаф 2") |
| `is_consumable` | Boolean | Not null, default=True |
| `space_id` | Integer | FK → Space.id, nullable, indexed |
| `created_at` | DateTime | Not null, default=utcnow |
| `updated_at` | DateTime | Not null, default=utcnow, onupdate=utcnow |

---

## 3. Pydantic Schemas

### Token/Auth
- **`UserCreate`**: `email: EmailStr`, `password: str` (min_length=6)
- **`UserOut`**: `id`, `email`, `created_at`
- **`Token`**: `access_token`, `token_type: "bearer"`

### Spaces
- **`SpaceCreate`**: `name`, `description?`
- **`SpaceUpdate`**: `name?`, `description?`
- **`SpaceOut`**: `id`, `name`, `description`, `created_by`, `created_at`, `owner: UserOut`, `members: List[MembershipOut]`

### Memberships
- **`MembershipCreate`**: `user_id`, `role: "member"`
- **`MembershipOut`**: `id`, `user_id`, `space_id`, `role`, `joined_at`, `user: UserOut`

### Invites
- **`InviteCreate`**: `expires_in_hours: 48`
- **`InviteOut`**: `id`, `space_id`, `token`, `created_by`, `expires_at`, `used`, `created_at`

### Items
- **`ItemCreate`**: `name`, `quantity: 0`, `unit?`, `min_quantity: 0`, `location?`, `is_consumable: true`
- **`ItemUpdate`**: all fields optional (`name?`, `quantity?`, `unit?`, `min_quantity?`, `location?`, `is_consumable?`, `space_id?`)
- **`ItemOut`**: all Item fields + computed `low_stock: bool` (`quantity <= min_quantity`)
- **`BulkUpdateItem`**: `item_id`, `quantity`
- **`QuantityUpdate`**: `quantity`

### Stats
- **`LowStockItem`**: `id`, `name`, `quantity`, `min_quantity`, `unit?`, `location?`, `space_id?`, `space_name?`
- **`SpaceStats`**: `total_items`, `low_stock_items`, `low_stock_details: List[LowStockItem]`
- **`SpaceWithStats`**: SpaceOut + `stats: SpaceStats`

---

## 4. API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Request | Response | Description |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | — | `UserCreate` | `Token` | Register new user, auto-creates JWT |
| POST | `/api/auth/login` | — | `UserCreate` | `Token` | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | — | `UserOut` | Current user info |

### Spaces — `/api/spaces`

| Method | Path | Auth | Request | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/spaces` | Bearer | — | `List[SpaceOut]` | All spaces user belongs to |
| POST | `/api/spaces` | Bearer | `SpaceCreate` | `SpaceOut` | Create space (auto-membership as owner) |
| GET | `/api/spaces/{space_id}` | Bearer | — | `SpaceOut` | Space details with members |
| PUT | `/api/spaces/{space_id}` | Bearer (owner) | `SpaceUpdate` | `SpaceOut` | Update space |
| DELETE | `/api/spaces/{space_id}` | Bearer (owner) | — | `{"detail": "Space deleted"}` | Delete space |
| GET | `/api/spaces/{space_id}/stats` | Bearer (member) | — | `SpaceWithStats` | Space statistics |
| POST | `/api/spaces/{space_id}/invite` | Bearer (member) | `InviteCreate` | `{invite_token}` | Create invite |
| GET | `/api/invites/{token}` | Bearer | — | `{space_id}` | Accept invite, join space |

### Items — `/api/spaces/{space_id}/items`

| Method | Path | Auth | Request | Response | Description |
|---|---|---|---|---|---|
| GET | `/api/spaces/{space_id}/items` | Bearer (member) | `?low_stock=true` | `List[ItemOut]` | List items (optionally low-stock only) |
| GET | `/api/spaces/{space_id}/items/{item_id}` | Bearer (member) | — | `ItemOut` | Single item |
| POST | `/api/spaces/{space_id}/items` | Bearer (member) | `ItemCreate` | `ItemOut` | Create item |
| PUT | `/api/spaces/{space_id}/items/{item_id}` | Bearer (member) | `ItemUpdate` | `ItemOut` | Update item |
| DELETE | `/api/spaces/{space_id}/items/{item_id}` | Bearer (member) | — | `{"detail": "Item deleted"}` | Delete item |
| PATCH | `/api/spaces/{space_id}/items/bulk` | Bearer (member) | `List[BulkUpdateItem]` | `{detail}` | Bulk quantity update |
| POST | `/api/spaces/{space_id}/items/{item_id}/add` | Bearer (member) | `QuantityUpdate` | `ItemOut` | Add to quantity |
| POST | `/api/spaces/{space_id}/items/{item_id}/consume` | Bearer (member) | `QuantityUpdate` | `ItemOut` | Subtract from quantity (validates not negative) |

---

## 5. Authentication & Authorization

### JWT Configuration
- **Algorithm:** HS256
- **SECRET_KEY:** `"prozapas-dev-secret-key-change-in-production"`
- **Expiry:** 10080 minutes (7 days)
- **Claim:** `sub` = user_id (string)

### Password Handling
- **Hashing:** bcrypt via passlib `CryptContext(schemes=["bcrypt"])`
- **Functions:** `hash_password(str) → str`, `verify_password(plain, hashed) → bool`

### Token Flow
1. Register/Login → backend returns JWT
2. Frontend stores token in `localStorage`
3. Axios interceptor attaches `Authorization: Bearer <token>` to all `/api` requests
4. Backend `get_current_user` dependency decodes JWT, looks up User by `sub`

### Dependencies
- **`get_current_user`** — extracts Bearer token, decodes JWT, returns `User` or raises 401
- **`require_membership`** — verifies user is a member of the given `space_id`, returns `Membership` or raises 403

### Role-Based Access
| Action | Required Role |
|---|---|
| View spaces/items | member |
| Create/update/delete items | member |
| Add/consume quantity | member |
| Create invite | member |
| Update/delete space | owner |
| Remove member | owner |

---

## 6. Business Logic

### Low Stock Detection
- Computed on `ItemOut`: `low_stock = quantity <= min_quantity`
- Filter: `GET /items?low_stock=true` returns only low-stock items
- Stats endpoint returns count and details of low-stock items

### Quantity Operations
- **Add:** `item.quantity += amount`
- **Consume:** validates `amount <= item.quantity`, then `item.quantity -= amount`; raises 400 if over-consumption

### Bulk Update
- Accepts array of `{item_id, quantity}`
- Verifies each item belongs to the given space before updating

### Invite System
- Token generated via `secrets.token_urlsafe(32)`
- Default expiry: 48 hours
- One-time use (`used` flag)
- On accept: creates `Membership(role="member")`, marks invite as used

### Cascading Deletes
- Deleting a Space cascades to: memberships, items, invites

---

## 7. Frontend Architecture

### Routing (React Router v7)

| Path | Component | Auth |
|---|---|---|
| `/login` | Login | No |
| `/register` | Register | No |
| `/invite/:token` | AcceptInvite | Both |
| `/` | Redirect → `/space/{first_id}/items` | Yes |
| `/space/:id/items` | Items | Yes |
| `/space/:id/low-stock` | LowStock | Yes |
| `/space/:id/settings` | SpaceSettings | Yes |

### State Management

| Layer | Tool | Purpose |
|---|---|---|
| Server state | React Query | Items, spaces, user, item history |
| Auth state | React Context + localStorage | User info, JWT token |
| Spaces state | React Context (SpacesContext) | List of spaces, active space |
| UI state | `useState` | Modals, forms, filters |

### React Query Configuration
- `staleTime: 30s`
- `retry: false`
- Manual query invalidation in mutation `onSuccess` callbacks

### API Client
- **Axios** with `baseURL: '/api'`
- Request interceptor: reads JWT from `localStorage`, sets `Authorization` header
- Response interceptor: dev-mode error logging

### Component Hierarchy

```
App
├── Auth Routes (Login, Register, AcceptInvite)
└── ProtectedRoute > SpaceLayout
    ├── Sidebar (space list, user footer, logout)
    ├── Top bar (hamburger, tabs: All/Low Stock, Add Item)
    └── Outlet
        ├── Items (ItemTable, AddItemModal, ItemCardModal)
        ├── LowStock (ItemTable with low_stock filter)
        └── SpaceSettings (members, invites, delete/leave)
```

### Key Components

| Component | Purpose |
|---|---|
| `ItemTable` | Responsive table (desktop) / cards (mobile); search, location filter, stock level bars, per-item actions |
| `ItemCardModal` | View/edit single item; quick +/- buttons; quantity history chart (Chart.js); delete |
| `AddItemModal` | Create item form (name, qty, unit, min_qty, location, consumable flag) |
| `AddSpaceModal` | Create space form (name, description) |
| `Sidebar` | Space navigation list, user info, logout button |
| `SpaceLayout` | Layout wrapper with sidebar, tabs, mobile hamburger |
| `Select` | Custom dropdown (no third-party dependency) |

### Styling
- **Tailwind CSS v3** with PostCSS
- **Font:** Inter
- **Color palette:** Slate (neutrals), Indigo-600 (primary), semantic colors (red=low, green/amber=stock levels)
- **Custom component classes:** `.btn-primary`, `.btn-secondary`, `.input-field`, `.card`, `.badge-*`
- **Responsive:** Mobile-first; sidebar hidden on mobile with hamburger overlay

---

## 8. Running the Project

### Backend
```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
python seed.py          # generate test data
```
- Server: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
npm run build           # production build
```

### Default Credentials
| Email | Password |
|---|---|
| `demo@prozapas.local` | `demo` |
| (seed-generated) | `password123` |

---

## 9. Project Structure

```
prozapas/
├── main.py                 # FastAPI entrypoint, router mounting, CORS
├── models.py               # SQLAlchemy models
├── schemas.py              # Pydantic schemas
├── database.py             # DB engine, session, Base
├── crud.py                 # CRUD operations (add/consume quantity)
├── auth_config.py          # JWT secret, algorithm, expiry
├── auth_utils.py           # Password hashing, token create/decode
├── dependencies.py         # get_current_user, require_membership
├── seed.py                 # Faker-based test data generation
├── routes/
│   ├── auth.py             # /api/auth/* endpoints
│   ├── spaces.py           # /api/spaces/* and /api/invites/* endpoints
│   └── items.py            # /api/spaces/{id}/items/* endpoints
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios client, API functions, TypeScript interfaces
│   │   ├── context/        # AuthContext, SpacesContext, useToken hook
│   │   ├── pages/          # Login, Register, Items, LowStock, SpaceSettings, AcceptInvite
│   │   ├── components/     # Sidebar, SpaceLayout, ItemTable, ItemCardModal, modals, Select
│   │   └── App.tsx         # Router configuration
│   ├── vite.config.ts      # Vite + proxy to backend
│   ├── tailwind.config.js
│   └── package.json
├── requirements.txt
└── prozapas.db             # SQLite database
```

---

## 10. Key Design Decisions

1. **Single active space:** `useActiveSpace()` always returns `spaces[0]` — no space switcher, user's first space is the context
2. **Token in localStorage:** Not httpOnly cookie — suitable for MVP but needs upgrade for production
3. **No CORS in dev:** Vite proxy eliminates CORS issues during development
4. **All UI in Russian:** Frontend text is localized to Russian
5. **No auto-retry:** React Query `retry: false` — failures are immediate, user must manually retry
6. **Computed low_stock:** Not stored in DB, calculated at serialization time (`quantity <= min_quantity`)
7. **Space auto-creation on register:** Registration on frontend auto-creates a "Home" space via backend
8. **Cascade deletes:** Space deletion removes all related memberships, items, and invites automatically
