# Про Запас — QWEN.md

## Project Overview

**Про Запас** — это приложение для учёта бытовых предметов и расходных материалов в различных пространствах (дом, офис, машина, гараж, дача и т.д.). Проект состоит из backend на FastAPI и frontend на React + TypeScript.

### Architecture

- **Backend:** Python 3.9+, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Query, Chart.js
- **Authentication:** JWT (python-jose), bcrypt hashing (passlib)
- **Database:** SQLite (`prozapas.db`)

### Key Features

- Регистрация и аутентификация пользователей (JWT-токены, 7-дневный срок жизни)
- Мульти-пространства (Spaces) — дом, офис, машина, гараж и т.д.
- CRUD предметов (Items) с привязкой к пространству
- Система приглашений (Invites) для совместного доступа к пространствам
- Роли пользователей: `owner` / `member`
- Операции с количеством: `add`, `consume`, `bulk_update`
- Отслеживание низкого остатка (quantity <= min_quantity)
- Seed-скрипт с реалистичными данными (Faker, ~40+ категорий предметов)

## Directory Structure

```
prozapas/
├── main.py              # Точка входа FastAPI, подключение роутеров
├── models.py            # SQLAlchemy модели (User, Space, Membership, Invite, Item)
├── schemas.py           # Pydantic схемы для валидации и сериализации
├── database.py          # DB engine, session, Base
├── crud.py              # CRUD операции для Items
├── auth_config.py       # JWT конфигурация (SECRET_KEY, ALGORITHM)
├── auth_utils.py        # Утилиты: hash_password, verify_password, create/decode token
├── dependencies.py      # FastAPI зависимости: get_current_user, require_membership
├── seed.py              # Генерация тестовых данных через Faker
├── routes/              # API роутеры
│   ├── auth.py          # /api/auth/register, /login, /me
│   ├── spaces.py        # /api/spaces, /invites
│   └── items.py         # /api/spaces/{space_id}/items
├── frontend/            # React-фронтенд (Vite + TypeScript)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── requirements.txt     # Python зависимости
```

## Building and Running

### Backend

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера (uvicorn)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Генерация тестовых данных
python seed.py
```

Сервер доступен по адресу `http://localhost:8000`. API Docs: `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Режим разработки
npm run dev

# Сборка
npm run build

# Preview production-сборки
npm run preview
```

Frontend доступен по адресу `http://localhost:5173`.

### Default Credentials

| Email | Password |
|-------|----------|
| demo@prozapas.local | demo |
| (сгенерированные) | password123 |

## API Endpoints

### Auth
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход, возврат JWT токена
- `GET /api/auth/me` — текущий пользователь (требует Bearer token)

### Spaces
- `GET /api/spaces` — список пространств пользователя
- `POST /api/spaces` — создание пространства
- `GET /api/spaces/{space_id}` — детали пространства с участниками
- `DELETE /api/spaces/{space_id}` — удаление (только owner)
- `POST /api/spaces/{space_id}/invites` — создание приглашения (48h expiry)
- `GET /api/invites/{token}` — принятие приглашения

### Items (в контексте пространства)
- `GET /api/spaces/{space_id}/items` — список предметов
- `GET /api/spaces/{space_id}/items/{item_id}` — один предмет
- `POST /api/spaces/{space_id}/items` — создание
- `PUT /api/spaces/{space_id}/items/{item_id}` — обновление
- `DELETE /api/spaces/{space_id}/items/{item_id}` — удаление
- `PATCH /api/spaces/{space_id}/items/bulk` — массовое обновление количества
- `POST /api/spaces/{space_id}/items/{item_id}/add` — добавить количество
- `POST /api/spaces/{space_id}/items/{item_id}/consume` — израсходовать количество

## Database Models

### User
- `id`, `email` (unique), `hashed_password`, `created_at`
- Relationships: `memberships`, `created_invites`

### Space
- `id`, `name`, `description`, `created_by` (FK → User), `created_at`
- Relationships: `owner`, `memberships`, `items`, `invites`

### Membership
- `id`, `user_id`, `space_id`, `role` (owner/member), `joined_at`

### Invite
- `id`, `space_id`, `token` (unique), `created_by`, `expires_at`, `used`, `created_at`

### Item
- `id`, `name`, `quantity`, `unit`, `min_quantity`, `location`, `is_consumable`, `space_id` (nullable), `created_at`, `updated_at`

## Development Conventions

- **Pydantic v2** стиль: `from_attributes = True` вместо `orm_mode`
- **SQLAlchemy 2.0**: declarative_base, relationship с `back_populates`
- **CORS**: разрешён origin `http://localhost:5173` (Vite dev server)
- **JWT**: `sub` claim должен быть строкой (требование python-jose)
- **SQLite**: `check_same_thread=False` для многопоточного доступа

## Key Configuration

- **SECRET_KEY:** `"prozapas-dev-secret-key-change-in-production"` (⚠️ требует замены для production)
- **ACCESS_TOKEN_EXPIRE_MINUTES:** 10080 (7 дней)
- **Database URL:** `sqlite:///./prozapas.db`
