from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis import close_redis
from app.middleware.security import SecurityHeadersMiddleware
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.diagnostic import router as diagnostic_router
from app.api.v1.routes.subscription import router as subscription_router
from app.api.v1.routes.study_plan import router as study_plan_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.questions import router as questions_router
from app.api.v1.routes.exams import router as exams_router
from app.api.v1.routes.performance import router as performance_router
from app.api.v1.routes.essays import router as essays_router
from app.api.v1.routes.gamification import router as gamification_router
from app.api.v1.routes.notifications import router as notifications_router
from app.api.v1.routes.contingency import router as contingency_router
from app.api.v1.routes.admin import router as admin_router
from app.api.v1.routes.analysis import router as analysis_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.engine import create_all_tables
    await create_all_tables()
    yield
    await close_redis()


app = FastAPI(
    title="SaaS ENEM API",
    version="1.0.0",
    description="Backend da plataforma SaaS ENEM",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

_cors_origins = [settings.FRONTEND_URL]
if settings.EXTRA_CORS_ORIGINS:
    _cors_origins.extend([o.strip() for o in settings.EXTRA_CORS_ORIGINS.split(",") if o.strip()])

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(diagnostic_router, prefix="/api/v1")
app.include_router(subscription_router, prefix="/api/v1")
app.include_router(study_plan_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(questions_router, prefix="/api/v1")
app.include_router(exams_router, prefix="/api/v1")
app.include_router(performance_router, prefix="/api/v1")
app.include_router(essays_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(contingency_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    from sqlalchemy import text
    from app.db.engine import AsyncSessionLocal
    from app.core.redis import get_redis

    db_ok = False
    try:
        async with AsyncSessionLocal() as s:
            await s.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    redis_ok = False
    try:
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception:
        pass

    overall = "ok" if (db_ok and redis_ok) else "degraded"
    return {
        "status": overall,
        "version": "1.1.0",
        "env": settings.APP_ENV,
        "services": {"database": db_ok, "redis": redis_ok},
    }
