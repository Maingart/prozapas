import os

SECRET_KEY = os.getenv("SECRET_KEY", "prozapas-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 дней
