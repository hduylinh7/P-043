from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import router
from src.config import get_settings
from src.db.database import init_db
from src.services.reminder_scheduler import start_reminder_scheduler, stop_reminder_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"Starting {settings.app_name} in {settings.app_env} mode")

    # Initialize DB & Redis
    try:
        await init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Database initialization warning: {e}")

    try:
        await init_redis()
    except Exception as e:
        print(f"Redis initialization warning: {e}")

    # Start Reminder Scheduler
    try:
        start_reminder_scheduler(interval_seconds=60)
        print("Reminder scheduler started successfully.")
    except Exception as e:
        print(f"Reminder scheduler warning: {e}")

    yield

    await stop_reminder_scheduler()
    await close_redis()
    print("Shutting down...")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI Agent backend with LangGraph, FastAPI, PostgreSQL, and Redis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    """Health check endpoint updated."""
    return {"status": "ok", "env": settings.app_env}




