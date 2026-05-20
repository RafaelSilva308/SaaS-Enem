from datetime import datetime
from pydantic import BaseModel, Field


class EssayThemeOut(BaseModel):
    id: str
    title: str
    description: str | None
    year: int | None
    source: str | None


class ThemesResponse(BaseModel):
    themes: list[EssayThemeOut]


class CreateEssayRequest(BaseModel):
    theme_id: str | None = None
    theme_title: str = Field(min_length=5, max_length=255)


class UpdateEssayRequest(BaseModel):
    text: str
    word_count: int
    line_count: int


class GrammarError(BaseModel):
    line: int
    excerpt: str
    correction: str
    type: str  # ortografia | concordância | pontuação | outro


class EssayAnalysisOut(BaseModel):
    ai_score: int                     # 0–1000 total
    competency1_score: int            # 0–200
    competency2_score: int
    competency3_score: int
    competency4_score: int
    competency5_score: int
    structural_feedback: str | None
    argument_feedback: str | None
    language_feedback: str | None
    grammar_errors: list[GrammarError]
    suggestions: list[str]
    analysed_at: datetime


class EssayOut(BaseModel):
    id: str
    theme_id: str | None
    theme_title: str | None
    text: str
    word_count: int | None
    line_count: int | None
    status: str                       # draft | submitted | under_review | reviewed
    submitted_at: datetime | None
    created_at: datetime
    analysis: EssayAnalysisOut | None


class EssayListItem(BaseModel):
    id: str
    theme_title: str | None
    word_count: int | None
    line_count: int | None
    status: str
    submitted_at: datetime | None
    created_at: datetime
    ai_score: int | None


class CreateEssayResponse(BaseModel):
    essay_id: str
    status: str


class SubmitResponse(BaseModel):
    essay_id: str
    status: str
    message: str
