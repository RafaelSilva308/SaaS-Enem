"""
Médias históricas nacionais do ENEM por disciplina (escala TRI, 200–1000).
Fonte: INEP — dados aproximados das edições 2019–2024.
"""

ENEM_HISTORICAL = [
    {"year": 2019, "linguagens": 524, "matematica": 519, "cn": 511, "ch": 527},
    {"year": 2020, "linguagens": 528, "matematica": 521, "cn": 516, "ch": 531},
    {"year": 2021, "linguagens": 525, "matematica": 522, "cn": 514, "ch": 528},
    {"year": 2022, "linguagens": 523, "matematica": 518, "cn": 512, "ch": 529},
    {"year": 2023, "linguagens": 527, "matematica": 524, "cn": 517, "ch": 532},
    {"year": 2024, "linguagens": 526, "matematica": 521, "cn": 515, "ch": 530},
]

# Frequência histórica por prioridade (% das edições em que o tópico apareceu)
PRIORITY_FREQUENCY = {
    "critical": 92,
    "high":     72,
    "medium":   48,
    "low":      22,
}
