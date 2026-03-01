"""
Mentora models package — new sub-package layout:

  models/
  ├── db/           SQLAlchemy ORM table definitions
  │   ├── user.py      UserORM
  │   └── document.py  DocumentORM
  ├── schemas/      Pydantic request / response models
  │   ├── auth.py       RegisterRequest, LoginRequest, UserOut, TokenResponse
  │   ├── debate.py     DebateStartRequest, DebateArgueRequest, …
  │   ├── document.py   DocumentOut
  │   ├── flashcard.py  FlashcardGenerateRequest, FlashcardModel, …
  │   ├── gamification.py  GamificationProfile, LeaderboardEntry
  │   ├── planner.py    TaskCreate, TaskUpdate, TaskOut, …
  │   └── quiz.py       QuizGenerateRequest, QuizResponse, …
  ├── constants/    Static data (XP rules, levels, badges)
  │   └── gamification.py  LEVELS, BADGES, XP_RULES, calc_level, award_xp
  └── ollama/       Ollama AI model weights + configuration
      ├── models.yaml  Model catalogue (phi4-mini, mxbai-embed-large)
      └── setup.sh     Pull / migrate models script

All symbols are re-exported here so legacy imports keep working unchanged.
"""

# ── ORM ───────────────────────────────────────────────────────────────────────
from models.db.user import UserORM
from models.db.document import DocumentORM

# ── Auth schemas ──────────────────────────────────────────────────────────────
from models.schemas.auth import (
    RegisterRequest, LoginRequest, UserOut, TokenResponse,
)

# ── Debate schemas ────────────────────────────────────────────────────────────
from models.schemas.debate import (
    DebateStartRequest, DebateArgueRequest, DebateMessage,
    DebateResponse, DebateAnalysis,
)

# ── Document schemas ──────────────────────────────────────────────────────────
from models.schemas.document import DocumentOut

# ── Flashcard schemas ─────────────────────────────────────────────────────────
from models.schemas.flashcard import (
    FlashcardGenerateRequest, FlashcardModel,
    FlashcardCreateRequest, FlashcardListResponse,
)

# ── Gamification schemas ──────────────────────────────────────────────────────
from models.schemas.gamification import GamificationProfile, LeaderboardEntry

# ── Planner schemas ───────────────────────────────────────────────────────────
from models.schemas.planner import (
    TaskCreate, TaskUpdate, TaskOut,
    IngestTaskRequest, WeeklyPlanRequest,
)

# ── Quiz / Exam schemas ───────────────────────────────────────────────────────
from models.schemas.quiz import (
    QuizGenerateRequest, ChoiceModel, QuestionModel, QuizResponse,
    SubmitAnswerRequest, QuizResultResponse, ExamGenerateRequest,
)

# ── Constants ─────────────────────────────────────────────────────────────────
from models.constants.gamification import (
    LEVELS, BADGES, XP_RULES, calc_level, award_xp,
)

__all__ = [
    # ORM
    "UserORM", "DocumentORM",
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
    # gamification schemas
    "GamificationProfile", "LeaderboardEntry",
    # planner
    "TaskCreate", "TaskUpdate", "TaskOut",
    "IngestTaskRequest", "WeeklyPlanRequest",
    # quiz / exam
    "QuizGenerateRequest", "ChoiceModel", "QuestionModel", "QuizResponse",
    "SubmitAnswerRequest", "QuizResultResponse", "ExamGenerateRequest",
    # constants
    "LEVELS", "BADGES", "XP_RULES", "calc_level", "award_xp",
]
