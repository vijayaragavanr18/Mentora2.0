"""Backward-compat shim — re-exported from structured sub-packages."""
from models.schemas.flashcard import (
    FlashcardGenerateRequest, FlashcardModel,
    FlashcardCreateRequest, FlashcardListResponse,
)

__all__ = [
    "FlashcardGenerateRequest", "FlashcardModel",
    "FlashcardCreateRequest", "FlashcardListResponse",
]
