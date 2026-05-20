"""
Serviço de análise de redação por IA.

Primário : Gemini 1.5 Flash (langchain-google-genai) — mais rápido e barato
Fallback  : GPT-4o (langchain-openai) — usado quando Gemini falha
Mock      : Análise determinística quando nenhuma API key está configurada

As 5 competências do ENEM:
  C1 — Domínio da norma culta da língua portuguesa             (0–200)
  C2 — Compreensão da proposta e aplicação interdisciplinar    (0–200)
  C3 — Seleção e organização de informações e argumentos       (0–200)
  C4 — Conhecimento dos mecanismos linguísticos de argumentação(0–200)
  C5 — Elaboração de proposta de intervenção                   (0–200)
"""

import json
import logging
import re
import uuid
from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.db.engine import AsyncSessionLocal
from app.models.models import Essay, EssayAnalysis, EssayTheme

logger = logging.getLogger(__name__)

# ── Prompt ────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Você é um corretor especialista do ENEM (Exame Nacional do Ensino Médio) do Brasil.
Corrija a redação abaixo com rigor técnico, seguindo os critérios oficiais do INEP.

TEMA DA REDAÇÃO: {theme}

CONTEXTO/PROPOSTA:
{context}

TEXTO DO ESTUDANTE:
{text}

---
Avalie cada uma das 5 competências. Para cada uma, atribua exclusivamente um dos valores:
0, 40, 80, 120, 160 ou 200 (múltiplos de 40).

Responda SOMENTE em JSON válido (sem markdown, sem blocos ```), com exatamente esta estrutura:
{{
  "c1_score": <int>,
  "c2_score": <int>,
  "c3_score": <int>,
  "c4_score": <int>,
  "c5_score": <int>,
  "structural_feedback": "<análise de C1 (norma culta) e C3 (organização paragráfica)>",
  "argument_feedback": "<análise de C2 (pertinência ao tema) e C5 (proposta de intervenção)>",
  "language_feedback": "<análise de C4 (mecanismos de coesão e coerência)>",
  "grammar_errors": [
    {{"line": <int>, "excerpt": "<trecho exato>", "correction": "<correção>", "type": "<ortografia|concordância|pontuação|regência|outro>"}}
  ],
  "suggestions": ["<sugestão 1>", "<sugestão 2>", "<sugestão 3>"]
}}

Importante:
- grammar_errors: liste no máximo 5 erros mais relevantes. Se não houver erros, retorne [].
- suggestions: exatamente 3 sugestões objetivas para melhorar a nota.
- Todos os campos são obrigatórios.
"""


def _build_prompt(theme_title: str, theme_desc: str | None, text: str) -> str:
    return _SYSTEM_PROMPT.format(
        theme=theme_title,
        context=theme_desc or "Tema livre — escreva sobre o assunto proposto.",
        text=text,
    )


# ── Parsing ───────────────────────────────────────────────────────

_VALID_SCORES = {0, 40, 80, 120, 160, 200}


def _nearest_valid(val: int) -> int:
    """Arredonda para o múltiplo de 40 mais próximo no intervalo [0, 200]."""
    clamped = max(0, min(200, val))
    return round(clamped / 40) * 40


def _parse_response(raw: str) -> dict:
    """
    Extrai JSON da resposta do LLM.
    Lida com: markdown code blocks, texto extra antes/depois do JSON.
    """
    # Remove markdown code fences se presentes
    text = re.sub(r"```(?:json)?", "", raw).strip()

    # Tenta encontrar o objeto JSON
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("Nenhum objeto JSON encontrado na resposta")

    parsed = json.loads(text[start:end])

    # Garante que scores são válidos
    for key in ("c1_score", "c2_score", "c3_score", "c4_score", "c5_score"):
        parsed[key] = _nearest_valid(int(parsed.get(key, 80)))

    # Garante campos obrigatórios
    parsed.setdefault("grammar_errors", [])
    parsed.setdefault("suggestions", ["Desenvolva mais o repertório sociocultural.",
                                      "Aprimore a proposta de intervenção com mais detalhes.",
                                      "Revise a coesão entre os parágrafos."])
    parsed.setdefault("structural_feedback", "Análise estrutural não disponível.")
    parsed.setdefault("argument_feedback",   "Análise argumentativa não disponível.")
    parsed.setdefault("language_feedback",   "Análise linguística não disponível.")

    return parsed


# ── AI Callers ────────────────────────────────────────────────────

async def _call_gemini(prompt: str) -> str:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.2,
        max_output_tokens=2048,
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content


async def _call_openai(prompt: str) -> str:
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage

    llm = ChatOpenAI(
        model="gpt-4o",
        api_key=settings.OPENAI_API_KEY,
        temperature=0.2,
        max_tokens=2048,
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content


# ── Mock analysis ─────────────────────────────────────────────────

def _mock_analysis(text: str) -> dict:
    """Análise determinística para dev sem API keys."""
    lines = [l for l in text.strip().split("\n") if l.strip()]
    words = len(text.split())

    n_lines = len(lines)
    if n_lines < 7:
        base = 80
    elif n_lines < 12:
        base = 120
    elif n_lines < 20:
        base = 160
    else:
        base = 160

    # Pequena variação baseada na razão palavras/linha (mais palavras = melhor)
    ratio = words / max(n_lines, 1)
    bonus = 40 if ratio > 18 else 0

    c1 = min(200, base + bonus)
    c2 = min(200, base)
    c3 = min(200, base + bonus)
    c4 = min(200, base)
    c5 = min(200, base)

    total = c1 + c2 + c3 + c4 + c5

    return {
        "c1_score": _nearest_valid(c1),
        "c2_score": _nearest_valid(c2),
        "c3_score": _nearest_valid(c3),
        "c4_score": _nearest_valid(c4),
        "c5_score": _nearest_valid(c5),
        "structural_feedback": (
            f"A redação possui {n_lines} linhas. A estrutura dissertativo-argumentativa "
            "está presente, com introdução, desenvolvimento e conclusão identificáveis. "
            "Recomenda-se maior desenvolvimento dos argumentos nos parágrafos centrais."
        ),
        "argument_feedback": (
            "O tema foi abordado com pertinência. Os argumentos sustentam a tese central, "
            "embora o repertório sociocultural possa ser ampliado. A proposta de intervenção "
            "precisa indicar mais claramente o agente, a ação, o modo e o efeito esperado."
        ),
        "language_feedback": (
            "O vocabulário é adequado ao registro formal exigido. Os mecanismos de coesão "
            "referencial e sequencial estão presentes. Recomenda-se diversificar os conectivos "
            "utilizados para garantir maior fluidez textual."
        ),
        "grammar_errors": [],
        "suggestions": [
            "Aprofunde a proposta de intervenção especificando agente, ação, meio, finalidade e detalhamento.",
            "Inclua dados estatísticos ou citações de especialistas para fortalecer a argumentação.",
            "Diversifique os operadores argumentativos (além disso, entretanto, por conseguinte) para melhorar a coesão.",
        ],
    }


# ── Main entry point ──────────────────────────────────────────────

async def call_ai(theme_title: str, theme_desc: str | None, text: str) -> dict:
    """
    Chama Gemini Flash (primário) → GPT-4o (fallback) → mock.
    Retorna dicionário com scores e feedbacks.
    """
    prompt = _build_prompt(theme_title, theme_desc or "", text)

    # Tenta Gemini Flash
    if settings.GOOGLE_API_KEY:
        try:
            raw = await _call_gemini(prompt)
            return _parse_response(raw)
        except Exception as e:
            logger.warning("Gemini falhou: %s — tentando OpenAI", e)

    # Fallback para GPT-4o
    if settings.OPENAI_API_KEY:
        try:
            raw = await _call_openai(prompt)
            return _parse_response(raw)
        except Exception as e:
            logger.warning("OpenAI falhou: %s — usando mock", e)

    # Mock para desenvolvimento
    logger.info("Nenhuma API key configurada — usando análise mock")
    return _mock_analysis(text)


async def analyze_essay_background(essay_id: str) -> None:
    """
    Executa a análise em background com sessão DB própria.
    Chamada via FastAPI BackgroundTasks após o commit do submit.
    """
    async with AsyncSessionLocal() as db:
        await _analyze_essay(essay_id, db)


async def _analyze_essay(essay_id: str, db: AsyncSession) -> None:
    """Busca a redação, chama a IA e persiste a análise."""
    essay_uuid = uuid.UUID(essay_id)

    # Busca redação
    result = await db.exec(select(Essay).where(Essay.id == essay_uuid))
    essay = result.first()
    if not essay or essay.status != "under_review":
        return

    # Busca tema (para descrição/contexto)
    theme_desc: str | None = None
    if essay.theme_id:
        theme_r = await db.exec(select(EssayTheme).where(EssayTheme.id == essay.theme_id))
        theme = theme_r.first()
        if theme:
            theme_desc = theme.description

    # Chama IA
    try:
        analysis_data = await call_ai(
            theme_title=essay.theme_title or "Tema livre",
            theme_desc=theme_desc,
            text=essay.text or "",
        )
    except Exception as e:
        logger.error("Falha na análise da redação %s: %s", essay_id, e)
        essay.status = "draft"  # volta para rascunho para nova tentativa
        db.add(essay)
        await db.commit()
        return

    total = sum(
        analysis_data[f"c{i}_score"]
        for i in range(1, 6)
    )

    # Persiste análise
    analysis = EssayAnalysis(
        essay_id=essay_uuid,
        ai_score=total,
        competency1_score=analysis_data["c1_score"],
        competency2_score=analysis_data["c2_score"],
        competency3_score=analysis_data["c3_score"],
        competency4_score=analysis_data["c4_score"],
        competency5_score=analysis_data["c5_score"],
        structural_feedback=analysis_data.get("structural_feedback"),
        argument_feedback=analysis_data.get("argument_feedback"),
        language_feedback=analysis_data.get("language_feedback"),
        grammar_errors=analysis_data.get("grammar_errors", []),
        suggestions=analysis_data.get("suggestions", []),
        analysed_at=datetime.now(timezone.utc),
    )
    db.add(analysis)

    essay.status = "reviewed"
    db.add(essay)

    await db.commit()
    logger.info("Redação %s analisada — score=%d", essay_id, total)

    # XP por redação corrigida (+100 bônus se nota > 800)
    try:
        from app.services.gamification_service import award_xp
        bonus = 100 if total > 800 else 0
        async with AsyncSessionLocal() as xp_db:
            await award_xp(str(essay.user_id), "essay_reviewed", 30 + bonus, xp_db, essay_id)
    except Exception as e:
        logger.debug("XP award skipped: %s", e)

    # Notificação de redação corrigida
    try:
        from app.services.notifications_service import create_notification
        from app.schemas.notifications import NotifType
        await create_notification(
            essay.user_id, NotifType.ESSAY_ANALYZED,
            "Sua redação foi corrigida!",
            f"Nota: {total}/1000. Acesse para ver o feedback completo.",
            db,
            related_entity_type="essay",
            related_entity_id=essay_id,
        )
    except Exception:
        pass
