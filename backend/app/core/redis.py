from app.core.config import settings

_redis = None


async def get_redis():
    global _redis
    if _redis is not None:
        return _redis

    if settings.REDIS_URL:
        from redis.asyncio import Redis
        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    else:
        # Dev mode: in-memory Redis (fakeredis) — sem dependência externa
        import fakeredis.aioredis as fakeredis
        _redis = fakeredis.FakeRedis(decode_responses=True)

    return _redis


async def close_redis() -> None:
    global _redis
    if _redis:
        try:
            await _redis.aclose()
        except Exception:
            pass
        _redis = None
