"""
Longitudinal Chronological Medical Timeline Engine
Stage 7: Medical Journey Reconstruction & Episodic Clustering

Implements:
1. Multi-format Indian date extraction (DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY, 18/11/10, 8/10/23).
2. Document type normalization and chronological sorting.
3. Longitudinal episode clustering across months and years.
4. JSON structure for interactive Clinician Timeline visualizer widget.
"""

import re
from datetime import datetime
from typing import List, Dict, Any, Optional


INDIAN_DATE_PATTERNS = [
    # 18/11/2010, 18-11-2010, 18.11.2010
    r'\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](20\d\d|19\d\d)\b',
    # 18/11/10, 18-11-10 (2-digit year)
    r'\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](\d{2})\b',
    # ISO YYYY-MM-DD
    r'\b(20\d\d|19\d\d)[\/\-\.](0?[1-9]|1[012])[\/\-\.](0?[1-9]|[12][0-9]|3[01])\b',
    # Month names: 18 Nov 2010, 18 November 2010
    r'\b(0?[1-9]|[12][0-9]|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\,]+(20\d\d|19\d\d|\d{2})\b'
]


MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}


def parse_indian_date(date_str: str) -> Optional[datetime]:
    """
    Parses various handwritten and printed Indian date string conventions into a datetime object.
    """
    if not date_str:
        return None
    s = date_str.strip()

    # Try ISO first
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d")
    except Exception:
        pass

    # Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m1 = re.search(r'\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](20\d\d|19\d\d)\b', s)
    if m1:
        d, m, y = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        try:
            return datetime(y, m, d)
        except ValueError:
            pass

    # Pattern 2: DD/MM/YY (2-digit year)
    m2 = re.search(r'\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](\d{2})\b', s)
    if m2:
        d, m, y_short = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        # Convention: if yy <= 30 => 20yy else 19yy
        y = 2000 + y_short if y_short <= 30 else 1900 + y_short
        try:
            return datetime(y, m, d)
        except ValueError:
            pass

    # Pattern 3: DD Mon YYYY
    m3 = re.search(r'\b(0?[1-9]|[12][0-9]|3[01])\s+([A-Za-z]{3})[a-z]*[\s\,]+(\d{2,4})\b', s)
    if m3:
        d = int(m3.group(1))
        m_name = m3.group(2).lower()
        m = MONTH_MAP.get(m_name, 1)
        y_val = int(m3.group(3))
        y = y_val if y_val > 99 else (2000 + y_val if y_val <= 30 else 1900 + y_val)
        try:
            return datetime(y, m, d)
        except ValueError:
            pass

    return None


def extract_dates_from_raw_text(text: str) -> List[str]:
    """
    Finds all date occurrences in raw OCR text.
    """
    found = []
    for pat in INDIAN_DATE_PATTERNS:
        matches = re.finditer(pat, text, re.IGNORECASE)
        for m in matches:
            found.append(m.group(0))
    return found


def cluster_into_episodes(records: List[Dict[str, Any]], day_threshold: int = 45) -> List[Dict[str, Any]]:
    """
    Groups chronologically ordered medical records into distinct episodes of care.
    If consecutive records are within `day_threshold` days (default 45 days),
    they belong to the same clinical episode.
    """
    parsed_records = []
    for rec in records:
        raw_date = rec.get("date") or rec.get("document_date") or rec.get("created_at") or ""
        dt = parse_indian_date(str(raw_date))
        parsed_records.append({
            **rec,
            "_parsed_date": dt,
            "iso_date": dt.strftime("%Y-%m-%d") if dt else "Unknown Date"
        })

    # Sort records chronologically (known dates first, oldest to newest)
    known = [r for r in parsed_records if r["_parsed_date"] is not None]
    unknown = [r for r in parsed_records if r["_parsed_date"] is None]
    known.sort(key=lambda x: x["_parsed_date"])

    sorted_records = known + unknown
    episodes = []
    current_episode = None

    for r in sorted_records:
        dt = r["_parsed_date"]
        if current_episode is None:
            # Start first episode
            title = r.get("title") or r.get("summary") or r.get("document_type") or "Initial Clinical Encounter"
            current_episode = {
                "episode_id": f"ep_{len(episodes) + 1}",
                "title": f"Episode {len(episodes) + 1}: {title}",
                "start_date": r["iso_date"],
                "end_date": r["iso_date"],
                "records": [r]
            }
        else:
            prev_dt = current_episode["records"][-1]["_parsed_date"]
            if dt and prev_dt and (dt - prev_dt).days <= day_threshold:
                # Append to current episode
                current_episode["records"].append(r)
                current_episode["end_date"] = r["iso_date"]
            else:
                # Close current episode and start new
                episodes.append(current_episode)
                title = r.get("title") or r.get("summary") or r.get("document_type") or "Subsequent Clinical Care"
                current_episode = {
                    "episode_id": f"ep_{len(episodes) + 1}",
                    "title": f"Episode {len(episodes) + 1}: {title}",
                    "start_date": r["iso_date"],
                    "end_date": r["iso_date"],
                    "records": [r]
                }

    if current_episode:
        episodes.append(current_episode)

    # Clean up internal datetime object before returning JSON
    for ep in episodes:
        for rec in ep["records"]:
            rec.pop("_parsed_date", None)

    return episodes
