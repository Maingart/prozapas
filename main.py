from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routes.auth import router as auth_router
from routes.spaces import router as spaces_router
from routes.items import router as items_router

# Создание таблиц
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Про запас",
    description="Backend для учёта бытовых предметов",
    version="2.0.0",
    redirect_slashes=False,
)

# CORS для React-фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
