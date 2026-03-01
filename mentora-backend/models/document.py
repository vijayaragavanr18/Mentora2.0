"""Backward-compat shim — re-exported from structured sub-packages."""
from models.db.document import DocumentORM
from models.schemas.document import DocumentOut

__all__ = ["DocumentORM", "DocumentOut"]
