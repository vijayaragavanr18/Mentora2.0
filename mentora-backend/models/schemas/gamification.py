"""Pydantic schemas — gamification (profile and leaderboard)."""
from typing import List
from pydantic import BaseModel


class GamificationProfile(BaseModel):
    user_id: str
    xp: int
    level: int
    level_title: str
    next_level_xp: int
    badges: List[dict]
    current_streak: int
    longest_streak: int


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    xp: int
    level: int
    badges_count: int
