"""
Serviço de Notificações — Stage 3.2

create_notification() é o único ponto de entrada para criar notificações.
É intencionalmente simples: adiciona ao banco e comita.
Deve ser chamado após o commit da operação principal para não interferir com
transações em andamento.

Regra de segurança: nunca propagar exceções — notificações são informativas,
nunca críticas.
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.models.models import Notification, User, utcnow
from app.schemas.notifications import (
    NotificationOut, NotificationsResponse, UnreadCountResponse,
)

logger = logging.getLogger(__name__)


# ── Criar notificação ──────────────────────────────────────────────

async def create_notification(
    user_id: uuid.UUID,
    notif_type: str,
    title: str,
    message: str,
    db: AsyncSession,
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
) -> None:
    """
    Cria e persiste uma notificação para o usuário.
    Deve ser chamado APÓS o commit da operação principal.
    """
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=uuid.UUID(related_entity_id) if related_entity_id else None,
        is_read=False,
        created_at=utcnow(),
    )
    db.add(notif)
    await db.commit()

    # Web Push — fire-and-forget
    import asyncio
    asyncio.create_task(_send_push(user_id, title, message))


# ── Helpers ────────────────────────────────────────────────────────

def _to_out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=str(n.id),
        type=n.type,
        title=n.title,
        message=n.message,
        related_entity_type=n.related_entity_type,
        related_entity_id=str(n.related_entity_id) if n.related_entity_id else None,
        is_read=n.is_read,
        created_at=n.created_at,
    )


# ── Listar ────────────────────────────────────────────────────────

async def list_notifications(
    user: User,
    db: AsyncSession,
    page: int,
    per_page: int,
    unread_only: bool,
) -> NotificationsResponse:
    # Total e não lidas
    total_r = await db.exec(
        select(func.count()).select_from(Notification)  # type: ignore[arg-type]
        .where(Notification.user_id == user.id)
    )
    total = int(total_r.first() or 0)

    unread_r = await db.exec(
        select(func.count()).select_from(Notification)  # type: ignore[arg-type]
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)  # noqa: E712
    )
    unread_count = int(unread_r.first() or 0)

    query = (
        select(Notification)
        .where(Notification.user_id == user.id)
    )
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712

    query = (
        query
        .order_by(Notification.created_at.desc())  # type: ignore[arg-type]
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    count_for_pages = unread_count if unread_only else total
    notifs = (await db.exec(query)).all()
    total_pages = max(1, (count_for_pages + per_page - 1) // per_page)

    return NotificationsResponse(
        notifications=[_to_out(n) for n in notifs],
        total=count_for_pages,
        unread_count=unread_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


async def get_unread_count(user: User, db: AsyncSession) -> UnreadCountResponse:
    r = await db.exec(
        select(func.count()).select_from(Notification)  # type: ignore[arg-type]
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)  # noqa: E712
    )
    return UnreadCountResponse(count=int(r.first() or 0))


# ── Marcar como lida ───────────────────────────────────────────────

async def mark_read(user: User, notif_id: str, db: AsyncSession) -> None:
    r = await db.exec(
        select(Notification)
        .where(Notification.id == uuid.UUID(notif_id))
        .where(Notification.user_id == user.id)
    )
    notif = r.first()
    if notif and not notif.is_read:
        notif.is_read = True
        notif.read_at = utcnow()
        db.add(notif)
        await db.commit()


# ── Web Push ───────────────────────────────────────────────────────

async def subscribe_push(user_id: uuid.UUID, endpoint: str, keys: dict) -> None:
    """Persiste a subscription de push no Redis (TTL 90 dias)."""
    redis = await get_redis()
    sub = {"endpoint": endpoint, "keys": keys}
    await redis.set(f"push_sub:{user_id}", json.dumps(sub), ex=90 * 86400)


def get_vapid_public_key() -> str:
    return settings.VAPID_PUBLIC_KEY


async def _send_push(user_id: uuid.UUID, title: str, message: str, url: str = "/app/notificacoes") -> None:
    """
    Envia Web Push para o usuário se tiver subscription e pywebpush instalado.
    Fire-and-forget — nunca propaga exceções.
    """
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        return
    try:
        from pywebpush import webpush, WebPushException  # soft dep
        redis = await get_redis()
        raw = await redis.get(f"push_sub:{user_id}")
        if not raw:
            return
        sub = json.loads(raw)
        webpush(
            subscription_info=sub,
            data=json.dumps({"title": title, "message": message, "url": url}),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIMS_EMAIL},
        )
    except Exception as e:
        logger.debug("Push notification skipped for %s: %s", user_id, e)


async def mark_all_read(user: User, db: AsyncSession) -> int:
    r = await db.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .where(Notification.is_read == False)  # noqa: E712
    )
    unread = r.all()
    now = utcnow()
    for n in unread:
        n.is_read = True
        n.read_at = now
        db.add(n)
    if unread:
        await db.commit()
    return len(unread)
