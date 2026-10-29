import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Silk Optima Recruitment Portal API")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/silk_optima",
    )
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@silkoptima.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@2026!")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
