"""ORM — documents table."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from database.connection import Base


class DocumentORM(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    filename = Column(String(500), nullable=False)
    original_name = Column(String(500))
    subject = Column(String(100))
    grade = Column(String(20))
    title = Column(String(500))
    page_count = Column(Integer, default=0)
    file_size_kb = Column(Integer, default=0)
    status = Column(String(50), default="processing")
    chroma_collection_id = Column(String(255))
    summary = Column(Text, nullable=True)
    faq = Column(JSONB, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
