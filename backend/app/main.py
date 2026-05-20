from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis import close_redis
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.diagnostic import router as diagnostic_router
from app.api.v1.routes.subscription import router as subscription_router
from app.api.v1.routes.study_plan import router as study_plan_router


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(diagnostic_router, prefix="/api/v1")
app.include_router(subscription_router, prefix="/api/v1")
app.include_router(study_plan_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "env": settings.APP_ENV}
