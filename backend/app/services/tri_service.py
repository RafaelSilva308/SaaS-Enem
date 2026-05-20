"""
TRI — Teoria de Resposta ao Item (Modelo 3PL Simplificado)

Modelo logístico de 3 parâmetros:
    P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))

Parâmetros por item:
    a  = discriminação  (quão bem o item diferencia níveis de habilidade)
    b  = dificuldade    (nível de habilidade necessário para 50% de acerto excluindo chute)
    c  = pseudo-chute   (probabilidade de acerto ao acaso; 1/5 = 0.20 para ENEM)

Estimação de θ via Maximum Likelihood (Newton-Raphson iterativo).
Mapeamento para escala ENEM: score = 500 + θ × 100  ∈ [200, 1000]
"""

import math
from dataclasses import dataclass

# ─────────────────────────────────────────────────────────────────
# Parâmetros dos itens por dificuldade
# Baseados em parâmetros típicos de itens ENEM na literatura
# ─────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ItemParams:
    a: float  # discriminação  (típico ENEM: 0.5–2.5)
    b: float  # dificuldade    (escala θ: –3 a +3)
    c: float  # pseudo-chute   (5 alternativas → 0.20)


ITEM_PARAMS: dict[str | None, ItemParams] = {
    "easy":   ItemParams(a=0.80, b=-1.5, c=0.20),
    "medium": ItemParams(a=1.20, b= 0.0, c=0.20),
    "hard":   ItemParams(a=1.80, b= 1.5, c=0.20),
}
_DEFAULT = ItemParams(a=1.00, b=0.0, c=0.20)

# Limites de θ (±4 desvios-padrão cobre >99.99% da distribuição)
THETA_MIN = -4.0
THETA_MAX =  4.0

# Parâmetros da escala ENEM
ENEM_MEAN = 500
ENEM_SD   = 100


def get_item_params(difficulty: str | None) -> ItemParams:
    return ITEM_PARAMS.get(difficulty or "", _DEFAULT)


# ─────────────────────────────────────────────────────────────────
# Modelo 3PL
# ─────────────────────────────────────────────────────────────────

def p3pl(theta: float, item: ItemParams) -> float:
    """Probabilidade de acerto P(θ) pelo Modelo 3PL."""
    # Saturação numérica: clamp do expoente para evitar overflow
    z = -item.a * (theta - item.b)
    z = max(-500.0, min(500.0, z))
    return item.c + (1.0 - item.c) / (1.0 + math.exp(z))


def _safe_p(theta: float, item: ItemParams) -> float:
    """P(θ) com guarda contra log(0) — mantém ε afastado de 0 e 1."""
    return max(1e-9, min(1.0 - 1e-9, p3pl(theta, item)))


# ─────────────────────────────────────────────────────────────────
# Estimação de θ (MLE via Newton-Raphson)
# ─────────────────────────────────────────────────────────────────

def mle_theta(responses: list[tuple[bool, ItemParams]]) -> float:
    """
    Estima θ a partir da lista de respostas.

    Args:
        responses: lista de (acertou: bool, params_do_item: ItemParams)

    Returns:
        θ estimado, clamped em [THETA_MIN, THETA_MAX]
    """
    if not responses:
        return 0.0

    # Casos degenerados: todos certos ou todos errados
    n_correct = sum(1 for correct, _ in responses if correct)
    if n_correct == len(responses):
        return 3.0   # θ alto — tetos em +3 (evita +∞)
    if n_correct == 0:
        return -3.0  # θ baixo

    theta = 0.0  # ponto de partida: média da população

    for _ in range(150):
        L1 = 0.0  # ∂ ln L / ∂θ   (score function)
        L2 = 0.0  # ∂² ln L / ∂θ²  (curvatura — sempre ≤ 0)

        for correct, item in responses:
            p = _safe_p(theta, item)

            # Derivada de P em relação a θ  dP/dθ = a(1-c)·p̃·(1-p)/(1-c)
            # onde p̃ = P(θ) - c
            q   = p - item.c               # p̃
            dp  = item.a * q * (1.0 - p)   # dP/dθ × (1-c)  (sem o factor 1-c no denom)
            # ... simplificando:
            # dP/dθ = a·(p - c)·(1 - p) / (1 - c)
            denom_a = (1.0 - item.c)
            dp_dtheta = item.a * q * (1.0 - p) / max(denom_a, 1e-10)

            u = 1.0 if correct else 0.0

            # Score function: ∂ ln L / ∂θ = Σ (u - P) · dP/dθ / [P(1-P)]
            pq = p * (1.0 - p)
            if pq < 1e-12:
                continue
            L1 += (u - p) * dp_dtheta / pq

            # Informação de Fisher negativa (curvatura da log-verossimilhança)
            L2 -= (dp_dtheta ** 2) / max(pq, 1e-12)

        # Newton-Raphson: θ ← θ - L1/L2  (L2 < 0 → sinal correto)
        if abs(L2) < 1e-12:
            break

        delta = L1 / (-L2)

        # Amortecimento: limita passos grandes para estabilidade numérica
        delta = max(-0.5, min(0.5, delta))

        theta = max(THETA_MIN, min(THETA_MAX, theta + delta))

        if abs(delta) < 1e-7:
            break

    return theta


# ─────────────────────────────────────────────────────────────────
# Mapeamento θ → escala ENEM
# ─────────────────────────────────────────────────────────────────

def theta_to_enem(theta: float) -> int:
    """
    Converte θ para a escala ENEM [200, 1000].

    θ = 0   → 500  (média nacional)
    θ = ±1  → ±100 pontos  (desvio-padrão aproximado)
    θ = +3  → 800  (desempenho excelente)
    θ = -3  → 200  (nota mínima)
    """
    return max(200, min(1000, round(ENEM_MEAN + theta * ENEM_SD)))


def enem_to_theta(score: int) -> float:
    """Operação inversa: escala ENEM → θ (para cálculos de predição)."""
    return (score - ENEM_MEAN) / ENEM_SD


# ─────────────────────────────────────────────────────────────────
# Estimativa fallback (poucos itens)
# ─────────────────────────────────────────────────────────────────

def estimate_raw(correct: int, total: int) -> int:
    """
    Estimativa simples quando há itens demais para MLE confiável (< 3).
    Desconta o efeito do chute esperado (c = 0.20) antes de mapear.
    """
    if total == 0:
        return 350  # abaixo da média — sem dados suficientes
    raw = correct / total
    # Ajuste para pseudo-chute: (raw - c) / (1 - c)
    adjusted = max(0.0, (raw - 0.20) / 0.80)
    return max(200, min(1000, round(200 + adjusted * 800)))
