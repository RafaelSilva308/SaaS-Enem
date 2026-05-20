"""
Catálogo de badges (20 no total: 6 bronze, 8 silver, 6 gold).

condition_type / condition_value guiam a avaliação em gamification_service.py.
icon_url armazena o emoji do badge (compatível com o campo Text do modelo).
"""

BADGES = [
    # ── Bronze ────────────────────────────────────────────────────
    {
        "name": "Primeiro Passo",
        "description": "Complete o diagnóstico inicial",
        "icon_url": "🎯",
        "tier": "bronze",
        "condition_type": "diagnostic_completed",
        "condition_value": "1",
    },
    {
        "name": "Planejado",
        "description": "Gere seu plano de estudos personalizado",
        "icon_url": "📅",
        "tier": "bronze",
        "condition_type": "plan_generated",
        "condition_value": "1",
    },
    {
        "name": "Questões Iniciante",
        "description": "Responda 10 questões no banco",
        "icon_url": "❓",
        "tier": "bronze",
        "condition_type": "questions_answered",
        "condition_value": "10",
    },
    {
        "name": "Redator",
        "description": "Envie sua primeira redação para correção",
        "icon_url": "✍️",
        "tier": "bronze",
        "condition_type": "essays_submitted",
        "condition_value": "1",
    },
    {
        "name": "Simulador",
        "description": "Complete seu primeiro simulado",
        "icon_url": "📋",
        "tier": "bronze",
        "condition_type": "exams_completed",
        "condition_value": "1",
    },
    {
        "name": "Estudante Dedicado",
        "description": "Estude por 7 dias consecutivos",
        "icon_url": "📚",
        "tier": "bronze",
        "condition_type": "streak_days",
        "condition_value": "7",
    },

    # ── Silver ────────────────────────────────────────────────────
    {
        "name": "Questões Avançado",
        "description": "Acerte 100 questões no banco",
        "icon_url": "🎓",
        "tier": "silver",
        "condition_type": "questions_correct",
        "condition_value": "100",
    },
    {
        "name": "Maratonista",
        "description": "Estude por 30 dias consecutivos",
        "icon_url": "🏃",
        "tier": "silver",
        "condition_type": "streak_days",
        "condition_value": "30",
    },
    {
        "name": "Sprint Mestre",
        "description": "Conclua 3 sprints semanais",
        "icon_url": "⚡",
        "tier": "silver",
        "condition_type": "sprints_completed",
        "condition_value": "3",
    },
    {
        "name": "Expert em Simulados",
        "description": "Complete 5 simulados",
        "icon_url": "🏆",
        "tier": "silver",
        "condition_type": "exams_completed",
        "condition_value": "5",
    },
    {
        "name": "Nível 5",
        "description": "Alcance o nível 5",
        "icon_url": "⭐",
        "tier": "silver",
        "condition_type": "level_reached",
        "condition_value": "5",
    },
    {
        "name": "TRI Master",
        "description": "Obtenha TRI acima de 700 em alguma disciplina",
        "icon_url": "📊",
        "tier": "silver",
        "condition_type": "tri_above_700",
        "condition_value": "700",
    },
    {
        "name": "Questões 250",
        "description": "Responda 250 questões no banco",
        "icon_url": "🔥",
        "tier": "silver",
        "condition_type": "questions_answered",
        "condition_value": "250",
    },
    {
        "name": "Escritor Frequente",
        "description": "Envie 3 redações para correção",
        "icon_url": "📝",
        "tier": "silver",
        "condition_type": "essays_submitted",
        "condition_value": "3",
    },

    # ── Gold ─────────────────────────────────────────────────────
    {
        "name": "Escritor de Elite",
        "description": "Obtenha nota acima de 800 numa redação",
        "icon_url": "🌟",
        "tier": "gold",
        "condition_type": "essay_score_above",
        "condition_value": "800",
    },
    {
        "name": "Humanista",
        "description": "80% de acerto em Ciências Humanas (mín. 10 questões)",
        "icon_url": "🌍",
        "tier": "gold",
        "condition_type": "subject_accuracy_ch",
        "condition_value": "80",
    },
    {
        "name": "Cientista",
        "description": "80% de acerto em Ciências da Natureza (mín. 10 questões)",
        "icon_url": "🔬",
        "tier": "gold",
        "condition_type": "subject_accuracy_cn",
        "condition_value": "80",
    },
    {
        "name": "Matemático",
        "description": "80% de acerto em Matemática (mín. 10 questões)",
        "icon_url": "📐",
        "tier": "gold",
        "condition_type": "subject_accuracy_matematica",
        "condition_value": "80",
    },
    {
        "name": "Linguista",
        "description": "80% de acerto em Linguagens (mín. 10 questões)",
        "icon_url": "📖",
        "tier": "gold",
        "condition_type": "subject_accuracy_linguagens",
        "condition_value": "80",
    },
    {
        "name": "Nível 10",
        "description": "Alcance o nível 10",
        "icon_url": "💎",
        "tier": "gold",
        "condition_type": "level_reached",
        "condition_value": "10",
    },
]
