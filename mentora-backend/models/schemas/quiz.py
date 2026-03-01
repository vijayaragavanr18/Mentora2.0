"""Pydantic schemas — quiz and exam."""
from typing import Optional, List
from pydantic import BaseModel


class QuizGenerateRequest(BaseModel):
    topic: str
    doc_id: Optional[str] = None
    n: int = 10
    difficulty: str = "medium"       # easy | medium | hard
    types: List[str] = ["mcq"]       # mcq | fillblank | truefalse


class ChoiceModel(BaseModel):
    label: str
    text: str


class QuestionModel(BaseModel):
    id: str
    type: str
    question: str
    choices: Optional[List[ChoiceModel]] = None
    answer: str
    explanation: Optional[str] = None
    topic: Optional[str] = None


class QuizResponse(BaseModel):
    quiz_id: str
    topic: str
    questions: List[QuestionModel]


class SubmitAnswerRequest(BaseModel):
    quiz_id: str
    answers: List[dict]              # [{question_id, selected}, ...]


class QuizResultResponse(BaseModel):
    quiz_id: str
    score: int
    total: int
    percentage: float
    xp_earned: int
    breakdown: List[dict]


class ExamGenerateRequest(BaseModel):
    exam_id: str
    num_questions: Optional[int] = 40
    user_id: Optional[str] = None
