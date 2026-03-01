"""Pydantic schemas — planner tasks and slots."""
from typing import Optional, List, Any
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    course: Optional[str] = None
    type: str = "task"
    notes: Optional[str] = None
    due_at: Optional[int] = None     # Unix timestamp ms
    est_mins: int = 60
    priority: int = 3
    tags: List[str] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    course: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None
    due_at: Optional[int] = None
    est_mins: Optional[int] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    steps: Optional[List[Any]] = None


class TaskOut(BaseModel):
    id: str
    title: str
    course: Optional[str] = None
    type: str = "task"
    notes: Optional[str] = None
    due_at: Optional[int] = None
    est_mins: int = 60
    priority: int = 3
    status: str = "todo"
    tags: List[str] = []
    steps: List[Any] = []
    created_at: int = 0
    updated_at: int = 0

    class Config:
        from_attributes = True


class IngestTaskRequest(BaseModel):
    text: str   # Natural language e.g. "Study chemistry chapter 5 tomorrow"


class WeeklyPlanRequest(BaseModel):
    tasks: List[Any]
    preferences: Optional[dict] = None
