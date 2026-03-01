"""Pydantic schemas — flashcards."""
from typing import Optional, List
from pydantic import BaseModel


class FlashcardGenerateRequest(BaseModel):
    topic: str
    doc_id: Optional[str] = None
    n: int = 10


class FlashcardModel(BaseModel):
    id: str
    question: str
    answer: str
    tag: str = ""
    difficulty: str = "medium"
    created: int = 0


class FlashcardCreateRequest(BaseModel):
    question: str
    answer: str
    tag: str = ""
    difficulty: str = "medium"
    doc_id: Optional[str] = None


class FlashcardListResponse(BaseModel):
    flashcards: List[FlashcardModel]
