from pydantic import BaseModel


class HistoricalYear(BaseModel):
    year: int
    linguagens: int
    matematica: int
    cn: int
    ch: int


class ENEMHistoricalOut(BaseModel):
    user_scores: dict[str, int | None]   # subject → TRI score (None se sem dados)
    historical: list[HistoricalYear]
    has_user_data: bool


class TopicFrequencyItem(BaseModel):
    name: str
    frequency: int      # 0–100
    priority: str       # critical | high | medium | low


class TopicFrequencyOut(BaseModel):
    subjects: dict[str, list[TopicFrequencyItem]]


class CohortBucket(BaseModel):
    label: str
    count: int
    range_start: int
    range_end: int


class CohortComparisonOut(BaseModel):
    distribution: list[CohortBucket]
    user_score: int | None
    percentile: int | None     # 1–99, None se sem dados
    total_users: int
    has_user_data: bool


class TopProbableTopic(BaseModel):
    name: str
    priority: str
    frequency: int


class ProbableTopicsOut(BaseModel):
    subjects: dict[str, list[TopProbableTopic]]
