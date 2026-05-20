"""
Cliente HTTP assíncrono para a API do Asaas (pagamentos BR).
Sandbox: https://api-sandbox.asaas.com/api/v3
Prod:    https://api.asaas.com/v3

Degradação graciosa: se ASAAS_API_KEY não estiver configurada,
retorna dados mock para que o desenvolvimento prossiga sem credenciais reais.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

ASAAS_SANDBOX_URL = "https://api-sandbox.asaas.com/api/v3"
ASAAS_PROD_URL = "https://api.asaas.com/v3"


def _base_url() -> str:
    return ASAAS_SANDBOX_URL if settings.ASAAS_ENV != "production" else ASAAS_PROD_URL


def _headers() -> dict:
    return {"access_token": settings.ASAAS_API_KEY, "Content-Type": "application/json"}


def _mock_mode() -> bool:
    return not settings.ASAAS_API_KEY or settings.ASAAS_API_KEY in ("", "test")


# ── Customers ─────────────────────────────────────────────────────

async def get_or_create_customer(email: str, name: str, cpf_cnpj: str | None = None) -> dict:
    if _mock_mode():
        return {"id": f"mock_cus_{email.split('@')[0]}", "name": name, "email": email}

    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30) as client:
        # Buscar cliente existente
        resp = await client.get("/customers", params={"email": email})
        resp.raise_for_status()
        data = resp.json()
        if data.get("data"):
            return data["data"][0]

        # Criar novo cliente
        payload: dict[str, Any] = {"name": name, "email": email}
        if cpf_cnpj:
            payload["cpfCnpj"] = cpf_cnpj.replace(".", "").replace("-", "").replace("/", "")

        resp = await client.post("/customers", json=payload)
        resp.raise_for_status()
        return resp.json()


# ── Subscriptions ─────────────────────────────────────────────────

BILLING_CYCLES = {
    "premium_1m": {"cycle": "MONTHLY",   "value": 59.90, "label": "Mensal"},
    "premium_3m": {"cycle": "QUARTERLY", "value": 99.90, "label": "Trimestral"},
    "premium_6m": {"cycle": "SEMIANNUAL","value": 149.90,"label": "Semestral"},
}

BILLING_TYPE_MAP = {
    "pix":    "PIX",
    "boleto": "BOLETO",
    "credit_card": "CREDIT_CARD",
}


async def create_subscription(
    customer_id: str,
    plan_type: str,
    billing_method: str,
    credit_card: dict | None = None,
    credit_card_holder: dict | None = None,
    trial_days: int = 7,
) -> dict:
    cycle_info = BILLING_CYCLES[plan_type]
    next_due = (datetime.now(timezone.utc) + timedelta(days=trial_days)).strftime("%Y-%m-%d")

    if _mock_mode():
        mock_payment_id = f"mock_pay_{plan_type}_{billing_method}"
        return {
            "id": f"mock_sub_{plan_type}",
            "customer": customer_id,
            "billingType": BILLING_TYPE_MAP.get(billing_method, "PIX"),
            "cycle": cycle_info["cycle"],
            "value": cycle_info["value"],
            "nextDueDate": next_due,
            "status": "ACTIVE",
            "_mock_payment_id": mock_payment_id,
        }

    payload: dict[str, Any] = {
        "customer": customer_id,
        "billingType": BILLING_TYPE_MAP.get(billing_method, "PIX"),
        "cycle": cycle_info["cycle"],
        "value": cycle_info["value"],
        "nextDueDate": next_due,
        "description": f"SaaS ENEM — Plano {cycle_info['label']}",
    }

    if billing_method == "credit_card" and credit_card:
        payload["creditCard"] = credit_card
        payload["creditCardHolderInfo"] = credit_card_holder

    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30) as client:
        resp = await client.post("/subscriptions", json=payload)
        resp.raise_for_status()
        return resp.json()


async def cancel_subscription(asaas_subscription_id: str) -> dict:
    if _mock_mode():
        return {"id": asaas_subscription_id, "status": "INACTIVE"}

    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30) as client:
        resp = await client.delete(f"/subscriptions/{asaas_subscription_id}")
        resp.raise_for_status()
        return resp.json()


# ── Payments & PIX ────────────────────────────────────────────────

async def get_subscription_payments(asaas_subscription_id: str) -> list[dict]:
    if _mock_mode():
        return [{"id": f"mock_pay_{asaas_subscription_id}", "status": "PENDING", "value": 59.90}]

    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30) as client:
        resp = await client.get("/payments", params={"subscription": asaas_subscription_id})
        resp.raise_for_status()
        return resp.json().get("data", [])


async def get_pix_qr_code(payment_id: str) -> dict:
    if _mock_mode():
        return {
            "encodedImage": "",  # base64 vazio em dev
            "payload": "00020126580014BR.GOV.BCB.PIX0136mock-pix-key-for-dev-environment5204000053039865406" + "59.905802BR5913SaaS ENEM Dev6009SAO PAULO62070503***6304MOCK",
            "expirationDate": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        }

    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30) as client:
        resp = await client.get(f"/payments/{payment_id}/pixQrCode")
        resp.raise_for_status()
        return resp.json()


async def get_boleto_url(payment_id: str) -> str:
    if _mock_mode():
        return f"https://sandbox.asaas.com/mock-boleto/{payment_id}"

    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30) as client:
        resp = await client.get(f"/payments/{payment_id}")
        resp.raise_for_status()
        data = resp.json()
        return data.get("bankSlipUrl", "")
