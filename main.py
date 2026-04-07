import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routes.auth import router as auth_router
from routes.spaces import router as spaces_router
from routes.items import router as items_router

app = FastAPI(
    title="Про запас",
    description="Backend для учёта бытовых предметов",
    version="2.0.0",
    redirect_slashes=False,
)


@app.on_event("startup")
def on_startup():
    """Create tables on startup, safe to call multiple times."""
    Base.metadata.create_all(bind=engine)

# CORS для React-фронтенда
# Читаем из env: через запятую, например "http://localhost:5173,https://example.com"
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роуты
app.include_router(auth_router)
app.include_router(spaces_router)
app.include_router(items_router)


@app.get("/")
def root():
    return {
        "message": "Про запас API v2",
        "docs": "/docs",
        "auth": "/api/auth/register",
        "spaces": "/api/spaces",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
