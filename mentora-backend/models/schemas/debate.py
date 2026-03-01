"""Pydantic schemas — debate."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class DebateStartRequest(BaseModel):
    topic: str
    position: str = "for"     # user position: for | against
    doc_id: Optional[str] = None
    lang: str = "en"


class DebateArgueRequest(BaseModel):
    argument: str


class DebateMessage(BaseModel):
    role: str                  # user | ai
    content: str
    timestamp: Optional[str] = None


class DebateResponse(BaseModel):
    debate_id: str
    topic: str
    position: str
    history: List[DebateMessage]
    status: str
    winner: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None


class DebateAnalysis(BaseModel):
    winner: str
    user_score: int
    ai_score: int
    feedback: str
    user_strengths: List[str]
    user_weaknesses: List[str]
    ai_conceded: bool
