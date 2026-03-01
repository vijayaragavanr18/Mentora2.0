"""Backward-compat shim — re-exported from structured sub-packages."""
from models.schemas.quiz import (
    QuizGenerateRequest, ChoiceModel, QuestionModel, QuizResponse,
    SubmitAnswerRequest, QuizResultResponse, ExamGenerateRequest,
)

__all__ = [
    "QuizGenerateRequest", "ChoiceModel", "QuestionModel", "QuizResponse",
    "SubmitAnswerRequest", "QuizResultResponse", "ExamGenerateRequest",
]
