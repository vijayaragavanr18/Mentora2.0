"""Backward-compat shim — re-exported from structured sub-packages."""
from models.schemas.gamification import GamificationProfile, LeaderboardEntry
from models.constants.gamification import LEVELS, BADGES, XP_RULES, calc_level, award_xp

__all__ = [
    "GamificationProfile", "LeaderboardEntry",
    "LEVELS", "BADGES", "XP_RULES", "calc_level", "award_xp",
]
