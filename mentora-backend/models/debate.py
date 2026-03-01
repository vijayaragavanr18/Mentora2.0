"""Backward-compat shim — re-exported from structured sub-packages."""
from models.schemas.debate import (
    DebateStartRequest, DebateArgueRequest, DebateMessage,
    DebateResponse, DebateAnalysis,
)

__all__ = [
    "DebateStartRequest", "DebateArgueRequest", "DebateMessage",
    "DebateResponse", "DebateAnalysis",
]
