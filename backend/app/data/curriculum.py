"""
Currículo do ENEM por disciplina.
Cada tópico tem: nome, horas estimadas de estudo inicial, prioridade
(baseada na frequência histórica nas provas) e disciplina.

priority: critical > high > medium > low
"""

from typing import TypedDict


class CurriculumTopic(TypedDict):
    name: str
    hours: float
    priority: str   # critical | high | medium | low
    subject: str


CURRICULUM: dict[str, list[CurriculumTopic]] = {
    "linguagens": [
        {"name": "Interpretação de Texto",       "hours": 8.0, "priority": "critical", "subject": "linguagens"},
        {"name": "Redação — Argumentação",        "hours": 8.0, "priority": "critical", "subject": "linguagens"},
        {"name": "Redação — Estrutura e Proposta","hours": 6.0, "priority": "critical", "subject": "linguagens"},
        {"name": "Gramática e Norma Culta",       "hours": 6.0, "priority": "high",     "subject": "linguagens"},
        {"name": "Literatura Brasileira",         "hours": 5.0, "priority": "high",     "subject": "linguagens"},
        {"name": "Figuras de Linguagem",          "hours": 3.0, "priority": "high",     "subject": "linguagens"},
        {"name": "Funções da Linguagem",          "hours": 2.0, "priority": "medium",   "subject": "linguagens"},
        {"name": "Variação Linguística",          "hours": 2.0, "priority": "medium",   "subject": "linguagens"},
        {"name": "Literatura Portuguesa",         "hours": 3.0, "priority": "medium",   "subject": "linguagens"},
        {"name": "Língua Estrangeira",            "hours": 4.0, "priority": "medium",   "subject": "linguagens"},
        {"name": "Gêneros Textuais",              "hours": 2.0, "priority": "medium",   "subject": "linguagens"},
        {"name": "Semântica e Estilística",       "hours": 2.0, "priority": "low",      "subject": "linguagens"},
    ],
    "matematica": [
        {"name": "Funções do 1° e 2° Grau",      "hours": 8.0, "priority": "critical", "subject": "matematica"},
        {"name": "Geometria Plana",               "hours": 7.0, "priority": "critical", "subject": "matematica"},
        {"name": "Estatística e Probabilidade",   "hours": 7.0, "priority": "critical", "subject": "matematica"},
        {"name": "Álgebra Básica",                "hours": 6.0, "priority": "high",     "subject": "matematica"},
        {"name": "Porcentagem e Juros",           "hours": 5.0, "priority": "high",     "subject": "matematica"},
        {"name": "Geometria Espacial",            "hours": 5.0, "priority": "high",     "subject": "matematica"},
        {"name": "Trigonometria",                 "hours": 5.0, "priority": "high",     "subject": "matematica"},
        {"name": "Logaritmos e Exponenciais",     "hours": 4.0, "priority": "medium",   "subject": "matematica"},
        {"name": "Progressões (PA e PG)",         "hours": 4.0, "priority": "medium",   "subject": "matematica"},
        {"name": "Combinatória",                  "hours": 3.0, "priority": "medium",   "subject": "matematica"},
        {"name": "Matrizes e Determinantes",      "hours": 3.0, "priority": "low",      "subject": "matematica"},
        {"name": "Sistemas Lineares",             "hours": 2.0, "priority": "low",      "subject": "matematica"},
    ],
    "cn": [
        {"name": "Mecânica Clássica",             "hours": 7.0, "priority": "critical", "subject": "cn"},
        {"name": "Reações Químicas",              "hours": 7.0, "priority": "critical", "subject": "cn"},
        {"name": "Citologia e Genética",          "hours": 6.0, "priority": "critical", "subject": "cn"},
        {"name": "Termologia e Termodinâmica",    "hours": 5.0, "priority": "high",     "subject": "cn"},
        {"name": "Química Orgânica",              "hours": 6.0, "priority": "high",     "subject": "cn"},
        {"name": "Eletricidade",                  "hours": 5.0, "priority": "high",     "subject": "cn"},
        {"name": "Soluções e pH",                 "hours": 4.0, "priority": "high",     "subject": "cn"},
        {"name": "Ecologia e Biomas",             "hours": 4.0, "priority": "medium",   "subject": "cn"},
        {"name": "Óptica e Ondas",                "hours": 4.0, "priority": "medium",   "subject": "cn"},
        {"name": "Evolução e Origem da Vida",     "hours": 3.0, "priority": "medium",   "subject": "cn"},
        {"name": "Fisiologia Humana",             "hours": 4.0, "priority": "medium",   "subject": "cn"},
        {"name": "Eletromagnetismo",              "hours": 3.0, "priority": "low",      "subject": "cn"},
    ],
    "ch": [
        {"name": "Brasil República — Séc. XX",   "hours": 6.0, "priority": "critical", "subject": "ch"},
        {"name": "Guerras Mundiais e Guerra Fria","hours": 6.0, "priority": "critical", "subject": "ch"},
        {"name": "Urbanização e Industrialização","hours": 5.0, "priority": "critical", "subject": "ch"},
        {"name": "Brasil Colônia e Império",      "hours": 5.0, "priority": "high",     "subject": "ch"},
        {"name": "Questões Ambientais Globais",   "hours": 4.0, "priority": "high",     "subject": "ch"},
        {"name": "Geopolítica Contemporânea",     "hours": 4.0, "priority": "high",     "subject": "ch"},
        {"name": "Sociologia — Conceitos",        "hours": 4.0, "priority": "high",     "subject": "ch"},
        {"name": "Filosofia — Ética e Política",  "hours": 3.0, "priority": "high",     "subject": "ch"},
        {"name": "Geografia do Brasil",           "hours": 4.0, "priority": "medium",   "subject": "ch"},
        {"name": "Revolução Industrial e Capitalismo","hours": 3.0,"priority":"medium", "subject": "ch"},
        {"name": "Desigualdades Socioeconômicas", "hours": 3.0, "priority": "medium",   "subject": "ch"},
        {"name": "Cultura e Identidade",          "hours": 2.0, "priority": "low",      "subject": "ch"},
    ],
}

PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
SUBJECT_LABELS = {
    "linguagens": "Linguagens",
    "matematica": "Matemática",
    "cn": "Ciências da Natureza",
    "ch": "Ciências Humanas",
}
DAY_NAMES = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]

ENEM_DATE_2026 = (2026, 11, 2)  # 2 de novembro de 2026
