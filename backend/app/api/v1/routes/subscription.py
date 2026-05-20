from fastapi import APIRouter, Depends, Header, Request, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_active_user
from app.db.engine import get_session
from app.models.models import User
from app.schemas.subscription import (
    CancelSubscriptionRequest,
    CheckoutSessionResponse,
    CreateSubscriptionRequest,
    PlanResponse,
    SubscriptionStatusResponse,
)
from app.services import subscription_service

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/plans", response_model=list[PlanResponse])
async def get_plans():
    return subscription_service.get_plans()


@router.post("/activate-free", response_model=SubscriptionStatusResponse, status_code=201)
async def activate_free(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await subscription_service.activate_free(str(user.id), session)


@router.post("/create", response_model=CheckoutSessionResponse, status_code=201)
async def create_subscription(
    data: CreateSubscriptionRequest,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await subscription_service.create_subscription(user, data, session)


@router.get("/me", response_model=SubscriptionStatusResponse)
async def get_my_subscription(
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await subscription_service.get_my_subscription(str(user.id), session)


@router.post("/cancel")
async def cancel_subscription(
    data: CancelSubscriptionRequest,
    user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    return await subscription_service.cancel_subscription(str(user.id), session)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    session: AsyncSession = Depends(get_session),
):
    payload = await request.body()
    return await subscription_service.process_webhook_with_db(
        payload, stripe_signature or "", session
    )
