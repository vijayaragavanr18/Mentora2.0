"""Pydantic request/response schemas for all Mentora endpoints."""
from models.schemas.auth import RegisterRequest, LoginRequest, UserOut, TokenResponse
from models.schemas.debate import (
    DebateStartRequest, DebateArgueRequest, DebateMessage,
    DebateResponse, DebateAnalysis,
)
from models.schemas.document import DocumentOut
from models.schemas.flashcard import (
    FlashcardGenerateRequest, FlashcardModel,
    FlashcardCreateRequest, FlashcardListResponse,
)
from models.schemas.gamification import GamificationProfile, LeaderboardEntry
from models.schemas.planner import (
    TaskCreate, TaskUpdate, TaskOut,
    IngestTaskRequest, WeeklyPlanRequest,
)
from models.schemas.quiz import (
    QuizGenerateRequest, ChoiceModel, QuestionModel, QuizResponse,
    SubmitAnswerRequest, QuizResultResponse, ExamGenerateRequest,
)

__all__ = [
    # auth
    "RegisterRequest", "LoginRequest", "UserOut", "TokenResponse",
    # debate
    "DebateStartRequest", "DebateArgueRequest", "DebateMessage",
    "DebateResponse", "DebateAnalysis",
    # document
    "DocumentOut",
    # flashcard
    "FlashcardGenerateRequest", "FlashcardModel",
    "FlashcardCreateRequest", "FlashcardListResponse",
    # gamification
    "GamificationProfile", "LeaderboardEntry",
    # planner
    "TaskCreate", "TaskUpdate", "TaskOut",
    "IngestTaskRequest", "WeeklyPlanRequest",
    # quiz / exam
    "QuizGenerateRequest", "ChoiceModel", "QuestionModel", "QuizResponse",
    "SubmitAnswerRequest", "QuizResultResponse", "ExamGenerateRequest",
]
