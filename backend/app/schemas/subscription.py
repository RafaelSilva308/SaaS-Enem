from datetime import datetime
from typing import Literal

from pydantic import BaseModel


PlanType = Literal["free", "premium_1m", "premium_3m", "premium_6m"]
PaymentMethod = Literal["pix", "boleto", "credit_card"]


class PlanFeatures(BaseModel):
    label: str
    included: bool


class PlanResponse(BaseModel):
    id: PlanType
    name: str
    price_brl: float
    period_label: str
    highlight: bool
    trial_days: int
    features: list[PlanFeatures]


class CreateSubscriptionRequest(BaseModel):
    plan_type: PlanType
    payment_method: PaymentMethod
    coupon_code: str | None = None


class CheckoutSessionResponse(BaseModel):
    subscription_id: str
    payment_method: PaymentMethod
    # PIX
    pix_qr_code_url: str | None = None
    pix_copy_paste: str | None = None
    pix_expires_at: str | None = None
    # Boleto
    boleto_url: str | None = None
    boleto_barcode: str | None = None
    boleto_due_date: str | None = None
    # Cartão — client_secret do SetupIntent para confirmar no frontend
    setup_client_secret: str | None = None
    card_success: bool = False
    # Freemium
    is_free: bool = False


class SubscriptionStatusResponse(BaseModel):
    plan_type: PlanType
    status: str                     # active | trialing | past_due | canceled | free
    start_date: datetime
    end_date: datetime
    auto_renewal: bool
    amount_paid: float | None
    payment_method: str | None
    stripe_subscription_id: str | None
    days_remaining: int


class CancelSubscriptionRequest(BaseModel):
    reason: str | None = None       # feedback opcional


class ActivateFreeRequest(BaseModel):
    pass
