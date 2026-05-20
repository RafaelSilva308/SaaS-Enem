"""
Serviço de assinaturas via Stripe.

Fluxo principal:
1. Usuário seleciona plano → POST /subscriptions/create
2. Backend cria Stripe Customer + PaymentIntent (PIX/Boleto) ou Subscription (Cartão)
3. Frontend exibe QR code / boleto / confirmação de cartão
4. Stripe webhook confirma pagamento → atualiza subscriptions no DB
5. Middleware de assinatura verifica status em cada requisição premium

Modo mock: quando STRIPE_SECRET_KEY não está configurada, retorna dados de
desenvolvimento para que o fluxo frontend possa ser testado sem credenciais reais.
"""

import uuid
from datetime import datetime, timedelta, timezone

import stripe
from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.models.models import Subscription, User, utcnow
from app.schemas.subscription import (
    CheckoutSessionResponse,
    CreateSubscriptionRequest,
    PlanFeatures,
    PlanResponse,
    SubscriptionStatusResponse,
)

# ── Configuração Stripe ────────────────────────────────────────────

def _stripe_configured() -> bool:
    return bool(settings.STRIPE_SECRET_KEY and settings.STRIPE_SECRET_KEY.startswith("sk_"))


def _get_stripe():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


# ── Planos (config estática) ───────────────────────────────────────

PLAN_FEATURES_ALL = [
    "Diagnóstico completo",
    "Plano de estudos completo",
    "Banco de questões ilimitado",
    "Simulados ilimitados",
    "Score TRI estimado",
    "Correção de redação por IA",
    "Análise de desempenho completa",
    "Comunidade (postar e responder)",
    "Plano de contingência",
    "Análise comparativa",
]

PLAN_FEATURES_FREE = [
    "Diagnóstico completo",
    "Plano de estudos (4 semanas)",
    "20 questões por dia",
    "1 simulado completo por mês",
    "Análise de desempenho básica",
    "Comunidade (somente leitura)",
]

PLANS: list[PlanResponse] = [
    PlanResponse(
        id="free",
        name="Grátis",
        price_brl=0,
        period_label="para sempre",
        highlight=False,
        trial_days=0,
        features=[PlanFeatures(label=f, included=True) for f in PLAN_FEATURES_FREE]
        + [PlanFeatures(label=f, included=False) for f in PLAN_FEATURES_ALL if f not in PLAN_FEATURES_FREE],
    ),
    PlanResponse(
        id="premium_1m",
        name="1 mês",
        price_brl=59.90,
        period_label="por mês",
        highlight=False,
        trial_days=7,
        features=[PlanFeatures(label=f, included=True) for f in PLAN_FEATURES_ALL],
    ),
    PlanResponse(
        id="premium_3m",
        name="3 meses",
        price_brl=99.90,
        period_label="por trimestre",
        highlight=True,  # "Mais popular"
        trial_days=7,
        features=[PlanFeatures(label=f, included=True) for f in PLAN_FEATURES_ALL],
    ),
    PlanResponse(
        id="premium_6m",
        name="6 meses",
        price_brl=149.90,
        period_label="por semestre",
        highlight=False,
        trial_days=7,
        features=[PlanFeatures(label=f, included=True) for f in PLAN_FEATURES_ALL],
    ),
]

STRIPE_PRICE_IDS = {
    "premium_1m": settings.STRIPE_PRICE_ID_1M,
    "premium_3m": settings.STRIPE_PRICE_ID_3M,
    "premium_6m": settings.STRIPE_PRICE_ID_6M,
}

PLAN_DURATIONS_DAYS = {
    "free": 36500,      # ~100 anos
    "premium_1m": 30,
    "premium_3m": 90,
    "premium_6m": 180,
}

PLAN_PRICES = {
    "free": 0.0,
    "premium_1m": 59.90,
    "premium_3m": 99.90,
    "premium_6m": 149.90,
}


# ── Helpers ────────────────────────────────────────────────────────

async def _get_active_subscription(user_id: uuid.UUID, session: AsyncSession) -> Subscription | None:
    result = await session.exec(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .where(Subscription.status.in_(["active", "trialing"]))  # type: ignore[attr-defined]
        .order_by(Subscription.created_at.desc())  # type: ignore[attr-defined]
    )
    return result.first()


async def _get_or_create_stripe_customer(user: User) -> str:
    """Retorna stripe_customer_id, criando no Stripe se necessário."""
    s = _get_stripe()

    # Verificar se já existe customer no Stripe para este usuário
    customers = s.Customer.list(email=user.email, limit=1)
    if customers.data:
        return customers.data[0].id

    customer = s.Customer.create(name=user.name, email=user.email)
    return customer.id


# ── Service functions ──────────────────────────────────────────────

def get_plans() -> list[PlanResponse]:
    return PLANS


async def activate_free(user_id: str, session: AsyncSession) -> SubscriptionStatusResponse:
    uid = uuid.UUID(user_id)
    existing = await _get_active_subscription(uid, session)

    if existing:
        return await get_my_subscription(user_id, session)

    now = utcnow()
    sub = Subscription(
        id=uuid.uuid4(),
        user_id=uid,
        plan_type="free",
        status="active",
        start_date=now,
        end_date=now + timedelta(days=PLAN_DURATIONS_DAYS["free"]),
        amount_paid=0.0,
        auto_renewal=True,
    )
    session.add(sub)
    await session.commit()
    await session.refresh(sub)
    return _to_status_response(sub)


async def create_subscription(
    user: User,
    data: CreateSubscriptionRequest,
    session: AsyncSession,
) -> CheckoutSessionResponse:
    if data.plan_type == "free":
        await activate_free(str(user.id), session)
        return CheckoutSessionResponse(
            subscription_id="free",
            payment_method=data.payment_method,
            is_free=True,
        )

    # Modo mock (sem chave Stripe configurada)
    if not _stripe_configured():
        return await _create_mock_subscription(user, data, session)

    return await _create_stripe_subscription(user, data, session)


async def _create_mock_subscription(
    user: User,
    data: CreateSubscriptionRequest,
    session: AsyncSession,
) -> CheckoutSessionResponse:
    """Cria assinatura fictícia para desenvolvimento sem Stripe configurado."""
    now = utcnow()
    trial_end = now + timedelta(days=7)

    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan_type=data.plan_type,
        status="trialing",
        start_date=now,
        end_date=trial_end,
        payment_method=data.payment_method,
        amount_paid=PLAN_PRICES[data.plan_type],
        stripe_subscription_id=f"mock_sub_{uuid.uuid4().hex[:8]}",
        auto_renewal=True,
    )
    session.add(sub)
    await session.commit()

    if data.payment_method == "pix":
        return CheckoutSessionResponse(
            subscription_id=str(sub.id),
            payment_method="pix",
            pix_copy_paste="00020126580014BR.GOV.BCB.PIX0136mock-pix-key-for-development52040000530398654065" + str(PLAN_PRICES[data.plan_type]) + "5802BR5913SaaS ENEM Dev6009SAO PAULO62070503***6304MOCK",
            pix_expires_at=(now + timedelta(hours=1)).isoformat(),
        )
    elif data.payment_method == "boleto":
        return CheckoutSessionResponse(
            subscription_id=str(sub.id),
            payment_method="boleto",
            boleto_url="https://stripe.com/mock-boleto-dev",
            boleto_barcode="03399.99999 99999.999999 99999.999999 9 99990000005990",
            boleto_due_date=(now + timedelta(days=3)).strftime("%d/%m/%Y"),
        )
    else:
        # Cartão — mock confirma imediatamente
        sub.status = "active"
        sub.end_date = now + timedelta(days=PLAN_DURATIONS_DAYS[data.plan_type])
        session.add(sub)
        await session.commit()
        return CheckoutSessionResponse(
            subscription_id=str(sub.id),
            payment_method="credit_card",
            card_success=True,
        )


async def _create_stripe_subscription(
    user: User,
    data: CreateSubscriptionRequest,
    session: AsyncSession,
) -> CheckoutSessionResponse:
    s = _get_stripe()
    price_id = STRIPE_PRICE_IDS.get(data.plan_type)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Price ID não configurado para o plano {data.plan_type}. Configure STRIPE_PRICE_ID_* nas variáveis de ambiente.",
        )

    customer_id = await _get_or_create_stripe_customer(user)
    now = utcnow()
    trial_end_ts = int((now + timedelta(days=7)).timestamp())

    payment_method_types = {
        "pix": ["pix"],
        "boleto": ["boleto"],
        "credit_card": ["card"],
    }

    # Criar subscription com trial
    stripe_sub = s.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        trial_end=trial_end_ts,
        payment_settings={
            "payment_method_types": payment_method_types[data.payment_method],
            "save_default_payment_method": "on_subscription",
        },
        expand=["latest_invoice.payment_intent"],
        metadata={"user_id": str(user.id), "plan_type": data.plan_type},
    )

    # Salvar no DB
    sub = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan_type=data.plan_type,
        status="trialing",
        start_date=now,
        end_date=now + timedelta(days=PLAN_DURATIONS_DAYS[data.plan_type] + 7),
        payment_method=data.payment_method,
        amount_paid=PLAN_PRICES[data.plan_type],
        stripe_subscription_id=stripe_sub.id,
        auto_renewal=True,
    )
    session.add(sub)
    await session.commit()

    invoice = stripe_sub.get("latest_invoice", {})
    payment_intent = invoice.get("payment_intent", {}) if invoice else {}

    if data.payment_method == "pix":
        pix_data = payment_intent.get("next_action", {}).get("pix_display_qr_code", {})
        return CheckoutSessionResponse(
            subscription_id=str(sub.id),
            payment_method="pix",
            pix_qr_code_url=pix_data.get("image_url_svg"),
            pix_copy_paste=pix_data.get("data"),
            pix_expires_at=pix_data.get("expires_at"),
        )
    elif data.payment_method == "boleto":
        boleto_data = payment_intent.get("next_action", {}).get("boleto_display_details", {})
        return CheckoutSessionResponse(
            subscription_id=str(sub.id),
            payment_method="boleto",
            boleto_url=boleto_data.get("pdf", {}).get("hosted_voucher_url"),
            boleto_barcode=boleto_data.get("number"),
            boleto_due_date=boleto_data.get("expires_at"),
        )
    else:
        return CheckoutSessionResponse(
            subscription_id=str(sub.id),
            payment_method="credit_card",
            card_success=payment_intent.get("status") == "succeeded",
        )


def _to_status_response(sub: Subscription) -> SubscriptionStatusResponse:
    now = utcnow()
    # sub.end_date pode ser naive; normalizar
    end = sub.end_date
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    days_left = max(0, (end - now).days)

    return SubscriptionStatusResponse(
        plan_type=sub.plan_type,  # type: ignore[arg-type]
        status=sub.status,
        start_date=sub.start_date,
        end_date=sub.end_date,
        auto_renewal=sub.auto_renewal,
        amount_paid=float(sub.amount_paid) if sub.amount_paid else None,
        payment_method=sub.payment_method,
        stripe_subscription_id=sub.stripe_subscription_id,
        days_remaining=days_left,
    )


async def get_my_subscription(user_id: str, session: AsyncSession) -> SubscriptionStatusResponse:
    uid = uuid.UUID(user_id)
    sub = await _get_active_subscription(uid, session)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhuma assinatura ativa. Escolha um plano para continuar.",
        )
    return _to_status_response(sub)


async def cancel_subscription(user_id: str, session: AsyncSession) -> dict:
    uid = uuid.UUID(user_id)
    sub = await _get_active_subscription(uid, session)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assinatura não encontrada")
    if sub.plan_type == "free":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plano gratuito não pode ser cancelado")

    if _stripe_configured() and sub.stripe_subscription_id and not sub.stripe_subscription_id.startswith("mock_"):
        s = _get_stripe()
        s.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)

    sub.auto_renewal = False
    session.add(sub)
    await session.commit()

    return {"message": "Renovação automática cancelada. Seu acesso continua até o fim do período atual."}


async def process_webhook(payload: bytes, sig_header: str) -> dict:
    """Processa eventos do Stripe webhook e atualiza o banco."""
    if not _stripe_configured():
        return {"received": True, "mock": True}

    s = _get_stripe()
    try:
        event = s.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook signature inválida")

    return {"event_type": event["type"], "received": True}


async def process_webhook_with_db(payload: bytes, sig_header: str, session: AsyncSession) -> dict:
    """Versão com acesso ao banco para atualizar registros."""
    if not _stripe_configured():
        return {"received": True, "mock": True}

    s = _get_stripe()
    try:
        event = s.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assinatura inválida")

    event_type = event["type"]
    data_obj = event["data"]["object"]

    if event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        stripe_sub_id = data_obj["id"]
        stripe_status = data_obj["status"]

        status_map = {
            "active": "active",
            "trialing": "trialing",
            "past_due": "past_due",
            "canceled": "canceled",
            "unpaid": "past_due",
            "incomplete_expired": "expired",
        }

        result = await session.exec(
            select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        )
        sub = result.first()
        if sub:
            sub.status = status_map.get(stripe_status, stripe_status)
            if stripe_status == "active" and data_obj.get("current_period_end"):
                from datetime import datetime
                sub.end_date = datetime.fromtimestamp(
                    data_obj["current_period_end"], tz=timezone.utc
                )
            session.add(sub)
            await session.commit()

    elif event_type == "invoice.payment_succeeded":
        stripe_sub_id = data_obj.get("subscription")
        if stripe_sub_id:
            result = await session.exec(
                select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
            )
            sub = result.first()
            if sub and sub.status in ("trialing", "past_due"):
                sub.status = "active"
                session.add(sub)
                await session.commit()

    return {"event_type": event_type, "received": True}


async def check_subscription_access(
    user_id: str,
    required_plans: list[str],
    session: AsyncSession,
) -> bool:
    """Verifica se o usuário tem acesso a uma funcionalidade premium."""
    uid = uuid.UUID(user_id)
    sub = await _get_active_subscription(uid, session)
    if not sub:
        return False
    return sub.plan_type in required_plans
