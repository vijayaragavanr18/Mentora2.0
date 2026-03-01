"""ORM — users table."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from database.connection import Base


class UserORM(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="student")
    grade = Column(String(20), nullable=True)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
