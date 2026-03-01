"""Planner Router — CRUD tasks, NLP ingest, weekly plan generation."""
import uuid
import json
import time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database.connection import get_db
from models.planner import TaskCreate, TaskUpdate, TaskOut, IngestTaskRequest, WeeklyPlanRequest
from services import llm_service
from services.planner_nlp import parse_task
from routers.auth import get_current_user, UserORM

router = APIRouter(tags=["planner"])


def _row_to_task(row) -> TaskOut:
    d = dict(row._mapping)
    return TaskOut(
        id=str(d["id"]),
        title=d["title"],
        course=d.get("course"),
        type=d.get("type", "task"),
        notes=d.get("notes"),
        due_at=d.get("due_at"),
        est_mins=d.get("est_mins", 60),
        priority=d.get("priority", 3),
        status=d.get("status", "todo"),
        tags=json.loads(d["tags"]) if isinstance(d.get("tags"), str) else (d.get("tags") or []),
        steps=json.loads(d["steps"]) if isinstance(d.get("steps"), str) else (d.get("steps") or []),
        created_at=d.get("created_at", 0) or 0,
        updated_at=d.get("updated_at", 0) or 0,
    )


@router.get("/tasks", response_model=List[TaskOut])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    stmt = "SELECT * FROM planner_tasks"
    params: dict = {}
    if user:
        stmt += " WHERE user_id = :uid"
        params["uid"] = str(user.id)
    stmt += " ORDER BY priority DESC, due_at ASC NULLS LAST"
    result = await db.execute(text(stmt), params)
    return [_row_to_task(r) for r in result.fetchall()]


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    now_ms = int(time.time() * 1000)
    task_id = uuid.uuid4()
    await db.execute(
        text(
            "INSERT INTO planner_tasks "
            "(id, user_id, title, course, type, notes, due_at, est_mins, priority, status, tags, steps, created_at, updated_at) "
            "VALUES (:id, :uid, :title, :course, :type, :notes, :due_at, :est, :pri, 'todo', :tags, '[]', :now, :now)"
        ),
        {
            "id": str(task_id),
            "uid": str(user.id) if user else None,
            "title": body.title,
            "course": body.course,
            "type": body.type,
            "notes": body.notes,
            "due_at": body.due_at,
            "est": body.est_mins,
            "pri": body.priority,
            "tags": json.dumps(body.tags),
            "now": now_ms,
        },
    )
    await db.commit()
    result = await db.execute(text("SELECT * FROM planner_tasks WHERE id = :id"), {"id": str(task_id)})
    return _row_to_task(result.fetchone())


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    now_ms = int(time.time() * 1000)
    updates = body.model_dump(exclude_none=True)
    if "tags" in updates:
        updates["tags"] = json.dumps(updates["tags"])
    if "steps" in updates:
        updates["steps"] = json.dumps(updates["steps"])
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = now_ms
    set_clause = ", ".join([f"{k} = :{k}" for k in updates])
    updates["task_id"] = task_id
    await db.execute(
        text(f"UPDATE planner_tasks SET {set_clause} WHERE id = :task_id"),
        updates,
    )
    await db.commit()
    result = await db.execute(text("SELECT * FROM planner_tasks WHERE id = :id"), {"id": task_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Task not found")
    return _row_to_task(row)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM planner_tasks WHERE id = :id"), {"id": task_id})
    await db.commit()


@router.post("/tasks/ingest", response_model=TaskOut, status_code=201)
async def ingest_task(
    body: IngestTaskRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    """Parse natural language → create task."""
    parsed = parse_task(body.text)
    task_body = TaskCreate(
        title=parsed["title"],
        course=parsed.get("course"),
        due_at=parsed.get("due_at"),
        est_mins=parsed.get("est_mins", 60),
        priority=parsed.get("priority", 3),
        tags=parsed.get("tags", []),
    )
    return await create_task(task_body, db, user)


@router.post("/planner/weekly")
async def weekly_plan(
    body: WeeklyPlanRequest,
    user: Optional[UserORM] = Depends(get_current_user),
):
    """Generate a weekly study schedule from pending tasks."""
    tasks_str = json.dumps(body.tasks, indent=2)
    prompt = (
        f"You are a study planner. Given these tasks:\n{tasks_str}\n\n"
        "Create an optimized weekly study schedule. "
        "Return JSON: {{\"schedule\": [{{\"day\": \"Monday\", \"slots\": [{{\"task_id\": \"...\", \"start\": \"09:00\", \"end\": \"10:30\"}}]}}]}}"
    )
    raw = await llm_service.complete(prompt, temperature=0.3)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        schedule = json.loads(raw[start:end])
    except Exception:
        schedule = {"schedule": [], "raw": raw}
    return schedule


@router.post("/tasks/{task_id}/plan")
async def generate_task_plan(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    """Generate step-by-step study plan for a task."""
    result = await db.execute(text("SELECT * FROM planner_tasks WHERE id = :id"), {"id": task_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Task not found")
    task = dict(row._mapping)
    prompt = (
        f"Create a detailed step-by-step study plan for: '{task['title']}'\n"
        f"Course: {task.get('course', 'general')}, Estimated time: {task.get('est_mins', 60)} minutes\n"
        "Return JSON: {{\"steps\": [{{\"step\": 1, \"title\": \"...\", \"duration_mins\": 10, \"description\": \"...\"}}]}}"
    )
    raw = await llm_service.complete(prompt, temperature=0.3)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        plan = json.loads(raw[start:end])
        steps = plan.get("steps", [])
    except Exception:
        steps = []

    # Save steps back to task
    await db.execute(
        text("UPDATE planner_tasks SET steps = :steps WHERE id = :id"),
        {"steps": json.dumps(steps), "id": task_id},
    )
    await db.commit()
    return {"task_id": task_id, "steps": steps}
