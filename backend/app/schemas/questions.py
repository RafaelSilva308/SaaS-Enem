from pydantic import BaseModel


class QuestionOptionOut(BaseModel):
    letter: str
    text: str


class UserStatOut(BaseModel):
    attempts: int
    correct: int
    wrong: int
    marked_as_doubt: bool


class QuestionListItem(BaseModel):
    id: str
    subject: str
    subject_label: str
    topic: str | None
    difficulty: str | None
    year: int | None
    source: str | None
    statement_preview: str
    time_estimate_seconds: int
    stat: UserStatOut | None


class QuestionsListResponse(BaseModel):
    questions: list[QuestionListItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class QuestionDetailOut(BaseModel):
    id: str
    subject: str
    subject_label: str
    topic: str | None
    difficulty: str | None
    year: int | None
    source: str | None
    statement: str
    image_url: str | None
    time_estimate_seconds: int
    options: list[QuestionOptionOut]
    stat: UserStatOut | None


class AnswerRequest(BaseModel):
    question_id: str
    answer: str  # A | B | C | D | E


class AnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str | None
    xp_earned: int
    stat: UserStatOut


class MarkDoubtResponse(BaseModel):
    question_id: str
    marked_as_doubt: bool
