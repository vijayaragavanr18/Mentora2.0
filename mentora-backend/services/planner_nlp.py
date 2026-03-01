"""Planner NLP — parse natural language task descriptions using spaCy + dateparser."""
import re
from typing import Optional
from datetime import datetime
import time

try:
    import spacy
    try:
        _nlp = spacy.load("en_core_web_sm")
    except OSError:
        _nlp = None
    SPACY_AVAILABLE = True
except ImportError:
    _nlp = None
    SPACY_AVAILABLE = False

try:
    import dateparser
    DATEPARSER_AVAILABLE = True
except ImportError:
    DATEPARSER_AVAILABLE = False


COURSE_KEYWORDS = {
    "math": "Mathematics",
    "maths": "Mathematics",
    "algebra": "Mathematics",
    "geometry": "Mathematics",
    "calculus": "Mathematics",
    "physics": "Physics",
    "chemistry": "Chemistry",
    "chem": "Chemistry",
    "biology": "Biology",
    "bio": "Biology",
    "history": "History",
    "geo": "Geography",
    "geography": "Geography",
    "english": "English",
    "science": "Science",
    "computer": "Computer Science",
    "cs": "Computer Science",
    "economics": "Economics",
}

TIME_KEYWORDS = {
    "tomorrow": 1,
    "today": 0,
    "tonight": 0,
    "yesterday": -1,
    "next week": 7,
}

DURATION_RE = re.compile(
    r"(\d+)\s*(hours?|hrs?|minutes?|mins?)", re.IGNORECASE
)


def parse_task(text: str) -> dict:
    """
    Parse natural language task into structured fields.
    E.g. "Study chemistry chapter 5 tomorrow for 2 hours"
    → {title, course, due_at, est_mins}
    """
    result = {
        "title": text.strip(),
        "course": None,
        "due_at": None,
        "est_mins": 60,
        "priority": 3,
        "tags": [],
    }

    lower = text.lower()

    # ── Detect course ─────────────────────────────────────────────────────────
    for kw, course in COURSE_KEYWORDS.items():
        if kw in lower:
            result["course"] = course
            break

    # ── Detect time reference ──────────────────────────────────────────────────
    if DATEPARSER_AVAILABLE:
        parsed_date = dateparser.parse(
            text,
            settings={"PREFER_DATES_FROM": "future", "RETURN_AS_TIMEZONE_AWARE": False},
        )
        if parsed_date:
            result["due_at"] = int(parsed_date.timestamp() * 1000)
    else:
        # Fallback simple keyword date
        for kw, days_offset in TIME_KEYWORDS.items():
            if kw in lower:
                from datetime import timedelta
                dt = datetime.now() + timedelta(days=days_offset)
                result["due_at"] = int(dt.timestamp() * 1000)
                break

    # ── Detect estimated duration ─────────────────────────────────────────────
    match = DURATION_RE.search(text)
    if match:
        num = int(match.group(1))
        unit = match.group(2).lower()
        if "hour" in unit or "hr" in unit:
            result["est_mins"] = num * 60
        else:
            result["est_mins"] = num

    # ── Priority detection ───────────────────────────────────────────────────
    if any(w in lower for w in ["urgent", "asap", "critical", "important"]):
        result["priority"] = 5
    elif any(w in lower for w in ["high priority", "high"]):
        result["priority"] = 4
    elif any(w in lower for w in ["low priority", "low", "optional"]):
        result["priority"] = 2

    # ── Extract tags via spaCy noun chunks ───────────────────────────────────
    if _nlp:
        doc = _nlp(text)
        result["tags"] = list(
            {chunk.text.lower() for chunk in doc.noun_chunks if len(chunk.text) > 3}
        )[:5]

    return result
