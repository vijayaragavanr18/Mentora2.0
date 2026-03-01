"""Gamification Router — user XP profile and leaderboard."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database.connection import get_db
from models.gamification import GamificationProfile, LeaderboardEntry, calc_level
from routers.auth import get_current_user, UserORM, require_user

router = APIRouter(prefix="/api/gamification", tags=["gamification"])


async def _get_or_create_profile(user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        text("SELECT * FROM user_gamification WHERE user_id = :uid"),
        {"uid": user_id},
    )
    row = result.fetchone()
    if row:
        return dict(row._mapping)

    # Create default profile
    import uuid
    await db.execute(
        text(
            "INSERT INTO user_gamification (id, user_id, xp, level, badges, current_streak, longest_streak) "
            "VALUES (:id, :uid, 0, 1, '[]', 0, 0)"
        ),
        {"id": str(uuid.uuid4()), "uid": user_id},
    )
    await db.commit()
    return {
        "user_id": user_id,
        "xp": 0,
        "level": 1,
        "badges": "[]",
        "current_streak": 0,
        "longest_streak": 0,
        "last_active": None,
    }


@router.get("/profile", response_model=GamificationProfile)
async def get_profile(
    user: UserORM = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    import json
    profile = await _get_or_create_profile(str(user.id), db)
    xp = profile.get("xp", 0)
    lvl_info = calc_level(xp)
    badges = json.loads(profile["badges"]) if isinstance(profile.get("badges"), str) else (profile.get("badges") or [])

    return GamificationProfile(
        user_id=str(user.id),
        xp=xp,
        level=lvl_info["level"],
        level_title=lvl_info["title"],
        next_level_xp=lvl_info["next_level_xp"],
        badges=badges,
        current_streak=profile.get("current_streak", 0),
        longest_streak=profile.get("longest_streak", 0),
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    from models.gamification import calc_level
    import json

    result = await db.execute(
        text(
            "SELECT ug.user_id, u.name, ug.xp, ug.level, ug.badges "
            "FROM user_gamification ug "
            "JOIN users u ON u.id = ug.user_id "
            "ORDER BY ug.xp DESC LIMIT :lim"
        ),
        {"lim": limit},
    )
    rows = result.fetchall()
    entries = []
    for rank, row in enumerate(rows, 1):
        d = dict(row._mapping)
        badges = json.loads(d["badges"]) if isinstance(d.get("badges"), str) else (d.get("badges") or [])
        lvl_info = calc_level(d["xp"])
        entries.append(
            LeaderboardEntry(
                rank=rank,
                user_id=str(d["user_id"]),
                name=d["name"],
                xp=d["xp"],
                level=lvl_info["level"],
                badges_count=len(badges),
            )
        )
    return entries


@router.post("/award")
async def award_xp_endpoint(
    action: str,
    user: UserORM = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Internal: award XP for an action."""
    from services.gamification_service import award_xp, calc_level, check_badges, update_streak
    import json
    from datetime import date

    xp_gained = award_xp(action)
    if xp_gained == 0:
        return {"xp_gained": 0, "message": "Unknown action"}

    profile = await _get_or_create_profile(str(user.id), db)
    current_xp = (profile.get("xp") or 0) + xp_gained
    last_active = profile.get("last_active")
    current_streak = profile.get("current_streak", 0)

    new_streak, is_new_day = update_streak(last_active, current_streak)
    if is_new_day:
        current_xp += award_xp("daily_login")

    lvl_info = calc_level(current_xp)
    badges = json.loads(profile["badges"]) if isinstance(profile.get("badges"), str) else []
    new_badges = check_badges({**profile, "xp": current_xp, "badges": [b.get("id", b) if isinstance(b, dict) else b for b in badges]})
    all_badges = badges + new_badges

    await db.execute(
        text(
            "UPDATE user_gamification SET xp=:xp, level=:lvl, badges=:badges, "
            "current_streak=:streak, last_active=NOW()::date WHERE user_id=:uid"
        ),
        {
            "xp": current_xp,
            "lvl": lvl_info["level"],
            "badges": json.dumps(all_badges),
            "streak": new_streak,
            "uid": str(user.id),
        },
    )
    await db.commit()

    return {
        "xp_gained": xp_gained,
        "total_xp": current_xp,
        "level": lvl_info["level"],
        "new_badges": new_badges,
    }
