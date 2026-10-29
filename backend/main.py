from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.database.session import init_db
from app.routers.admin import router as admin_router
from app.routers.applications import router as applications_router
from app.routers.auth import router as auth_router
from app.routers.candidates import router as candidates_router
from app.routers.employees import router as employees_router
from app.routers.health import router as health_router
from app.routers.interviews import router as interviews_router
from app.routers.open_positions import router as open_positions_router
from app.routers.users import router as users_router

UPLOAD_ROOT = Path(__file__).resolve().parent / "app" / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Silk Optima Recruitment Portal API",
    version="0.1.0",
    description="Backend for the recruitment and employee management portal.",
)

settings = get_settings()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
# Comma-separated list of extra allowed origins, e.g. the Vercel deployment URL(s)
origins += [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(employees_router)
app.include_router(open_positions_router)
app.include_router(candidates_router)
app.include_router(applications_router)
app.include_router(admin_router)
app.include_router(interviews_router)


@app.on_event("startup")
def startup_event() -> None:
    try:
        init_db()
    except Exception as exc:
        print(f"Database initialization skipped: {exc}")


