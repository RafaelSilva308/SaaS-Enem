from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.notifications import (
    NotificationsResponse, PushSubscriptionIn, UnreadCountResponse, VapidPublicKeyOut,
)
from app.services import notifications_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await notifications_service.get_unread_count(current_user, session)


@router.get("", response_model=NotificationsResponse)
async def list_notifications(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await notifications_service.list_notifications(
        current_user, session, page, per_page, unread_only,
    )


@router.patch("/{notif_id}/read", status_code=204)
async def mark_read(
    notif_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    await notifications_service.mark_read(current_user, notif_id, session)


@router.patch("/read-all", status_code=200)
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    count = await notifications_service.mark_all_read(current_user, session)
    return {"marked_read": count}


@router.get("/vapid-public-key", response_model=VapidPublicKeyOut)
async def get_vapid_key(
    current_user: User = Depends(get_current_active_user),
):
    return VapidPublicKeyOut(public_key=notifications_service.get_vapid_public_key())


@router.post("/subscribe", status_code=204)
async def subscribe_push(
    data: PushSubscriptionIn,
    current_user: User = Depends(get_current_active_user),
):
    await notifications_service.subscribe_push(current_user.id, data.endpoint, data.keys)
