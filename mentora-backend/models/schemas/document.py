"""Pydantic schemas — documents (response shapes)."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


from typing import List


class FAQItem(BaseModel):
    q: str
    a: str


class DocumentOut(BaseModel):
    id: str
    filename: str
    original_name: Optional[str] = None
    subject: Optional[str] = None
    grade: Optional[str] = None
    title: Optional[str] = None
    page_count: int = 0
    file_size_kb: int = 0
    status: str = "processing"
    chroma_collection_id: Optional[str] = None   # e.g. "doc_<uuid>" — use this for RAG queries
    summary: Optional[str] = None
    faq: Optional[List[FAQItem]] = None
    created_at: datetime

    class Config:
        from_attributes = True
