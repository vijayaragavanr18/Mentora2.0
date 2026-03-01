"""Gamification Service — XP awarding, level calculation, badge unlocking."""
from datetime import date
from typing import Optional, Dict, List
from models.constants.gamification import LEVELS, BADGES, XP_RULES


def calc_level(xp: int) -> dict:
    """Return current level info and XP needed for next level."""
    current = LEVELS[0]
    for lvl in LEVELS:
        if xp >= lvl["min_xp"]:
            current = lvl
        else:
            break

    # Find next level
    idx = LEVELS.index(current)
    next_lvl = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else None
    next_xp = next_lvl["min_xp"] if next_lvl else current["min_xp"]

    return {
        "level": current["level"],
        "title": current["title"],
        "next_level_xp": next_xp,
        "progress_xp": xp - current["min_xp"],
        "needed_xp": next_xp - current["min_xp"],
    }


def award_xp(action: str, multiplier: int = 1) -> int:
    """Return XP for a given action key from XP_RULES."""
    base = XP_RULES.get(action, 0)
    return base * multiplier


def check_badges(profile: dict) -> List[dict]:
    """
    Given a gamification profile dict, return list of newly earned badge IDs.
    profile should have keys: xp, badges (list of str ids), streak, quiz_count, etc.
    """
    earned_ids = set(profile.get("badges", []))
    new_badges = []

    for badge in BADGES:
        if badge["id"] in earned_ids:
            continue

        bid = badge["id"]
        xp = profile.get("xp", 0)
        streak = profile.get("current_streak", 0)

        if bid == "xp_500" and xp >= 500:
            new_badges.append(badge)
        elif bid == "xp_1000" and xp >= 1000:
            new_badges.append(badge)
        elif bid == "streak_3" and streak >= 3:
            new_badges.append(badge)
        elif bid == "streak_7" and streak >= 7:
            new_badges.append(badge)
        elif bid == "first_quiz" and profile.get("quiz_count", 0) >= 1:
            new_badges.append(badge)
        elif bid == "perfect_quiz" and profile.get("perfect_quiz", False):
            new_badges.append(badge)
        elif bid == "first_flashcard" and profile.get("flashcard_count", 0) >= 1:
            new_badges.append(badge)
        elif bid == "first_debate" and profile.get("debate_count", 0) >= 1:
            new_badges.append(badge)
        elif bid == "debate_winner" and profile.get("debate_wins", 0) >= 1:
            new_badges.append(badge)
        elif bid == "upload_5" and profile.get("upload_count", 0) >= 5:
            new_badges.append(badge)

    return new_badges


def update_streak(last_active: Optional[date], current_streak: int) -> tuple[int, bool]:
    """
    Returns (new_streak, is_new_day).
    Streak resets if last active was > 1 day ago.
    """
    today = date.today()
    if last_active is None:
        return 1, True
    delta = (today - last_active).days
    if delta == 0:
        return current_streak, False   # Same day, no change
    elif delta == 1:
        return current_streak + 1, True   # Consecutive day
    else:
        return 1, True   # Streak broken
