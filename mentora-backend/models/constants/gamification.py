"""Gamification constants — XP rules, level table, and badge definitions."""
from typing import List, Dict

# ─── Level table ──────────────────────────────────────────────────────────────
LEVELS: List[Dict] = [
    {"level": 1,  "min_xp": 0,     "title": "Rookie"},
    {"level": 2,  "min_xp": 100,   "title": "Explorer"},
    {"level": 3,  "min_xp": 300,   "title": "Learner"},
    {"level": 4,  "min_xp": 600,   "title": "Scholar"},
    {"level": 5,  "min_xp": 1000,  "title": "Expert"},
    {"level": 6,  "min_xp": 1500,  "title": "Master"},
    {"level": 7,  "min_xp": 2200,  "title": "Sage"},
    {"level": 8,  "min_xp": 3000,  "title": "Mentor"},
    {"level": 9,  "min_xp": 4000,  "title": "Legend"},
    {"level": 10, "min_xp": 5500,  "title": "Grandmaster"},
]

# ─── XP rules ─────────────────────────────────────────────────────────────────
XP_RULES: Dict[str, int] = {
    "chat":              5,
    "quiz_correct":      5,
    "quiz_perfect":      50,
    "debate_complete":   30,
    "debate_win":        60,
    "upload_doc":        20,
    "flashcard_create":  10,
    "daily_login":       10,
    "streak_bonus":      5,      # per day
}

# ─── Badges ───────────────────────────────────────────────────────────────────
BADGES: List[Dict] = [
    {"id": "first_quiz",      "name": "Quiz Starter",      "icon": "🎯", "xp_required": 0,    "description": "Complete your first quiz"},
    {"id": "streak_3",        "name": "3-Day Streak",       "icon": "🔥", "xp_required": 0,    "description": "Study 3 days in a row"},
    {"id": "streak_7",        "name": "Week Warrior",       "icon": "🗡️", "xp_required": 0,    "description": "Study 7 days in a row"},
    {"id": "first_debate",    "name": "Debate Initiate",    "icon": "🗣️", "xp_required": 0,    "description": "Complete a debate"},
    {"id": "debate_winner",   "name": "Debate Champion",    "icon": "🏆", "xp_required": 0,    "description": "Win a debate"},
    {"id": "upload_5",        "name": "Doc Master",         "icon": "📚", "xp_required": 0,    "description": "Upload 5 documents"},
    {"id": "xp_500",          "name": "Knowledge Seeker",   "icon": "💡", "xp_required": 500,  "description": "Earn 500 XP"},
    {"id": "xp_1000",         "name": "Millennial Scholar", "icon": "🎓", "xp_required": 1000, "description": "Earn 1000 XP"},
    {"id": "perfect_quiz",    "name": "Perfect Score",      "icon": "⭐", "xp_required": 0,    "description": "Get 100% on a quiz"},
    {"id": "first_flashcard", "name": "Card Collector",     "icon": "🃏", "xp_required": 0,    "description": "Generate flashcards"},
]


# ─── Helpers ──────────────────────────────────────────────────────────────────
def calc_level(xp: int) -> dict:
    """Return level info dict for the given XP value."""
    current = LEVELS[0]
    for lvl in LEVELS:
        if xp >= lvl["min_xp"]:
            current = lvl
        else:
            break
    idx = LEVELS.index(current)
    next_lvl = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else current
    return {
        "level": current["level"],
        "title": current["title"],
        "current_xp": xp,
        "next_level_xp": next_lvl["min_xp"],
        "xp_to_next": max(0, next_lvl["min_xp"] - xp),
    }


def award_xp(action: str, multiplier: int = 1) -> int:
    """Return XP for a given action key from XP_RULES."""
    return XP_RULES.get(action, 0) * multiplier
