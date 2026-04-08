"""
TLE Data Cache Utility.
Caches CelesTrak responses to local JSON files to respect rate limits
(max 1 download per 2-hour update cycle).
"""

import os
import json
import time
from config import CACHE_DIR, CACHE_TTL_SECONDS


def _ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    os.makedirs(CACHE_DIR, exist_ok=True)


def get_cache_path(group: str) -> str:
    """Return the file path for a cached group."""
    _ensure_cache_dir()
    safe_name = group.lower().replace(" ", "_").replace("/", "_")
    return os.path.join(CACHE_DIR, f"tle_{safe_name}.json")


def is_cache_valid(group: str) -> bool:
    """Check if cache exists and is younger than CACHE_TTL_SECONDS."""
    path = get_cache_path(group)
    if not os.path.exists(path):
        return False
    try:
        with open(path, "r") as f:
            data = json.load(f)
        cached_time = data.get("_cached_at", 0)
        return (time.time() - cached_time) < CACHE_TTL_SECONDS
    except (json.JSONDecodeError, IOError):
        return False


def read_cache(group: str) -> list[dict] | None:
    """Read cached TLE data. Returns None if cache is invalid."""
    if not is_cache_valid(group):
        return None
    path = get_cache_path(group)
    try:
        with open(path, "r") as f:
            data = json.load(f)
        return data.get("satellites", [])
    except (json.JSONDecodeError, IOError):
        return None


def write_cache(group: str, satellites: list[dict]):
    """Write satellite data to cache with timestamp."""
    _ensure_cache_dir()
    path = get_cache_path(group)
    cache_data = {
        "_cached_at": time.time(),
        "_group": group,
        "_count": len(satellites),
        "satellites": satellites,
    }
    with open(path, "w") as f:
        json.dump(cache_data, f, indent=2)


def clear_cache(group: str = None):
    """Clear cache for a specific group or all groups."""
    if group:
        path = get_cache_path(group)
        if os.path.exists(path):
            os.remove(path)
    else:
        _ensure_cache_dir()
        for f in os.listdir(CACHE_DIR):
            if f.startswith("tle_") and f.endswith(".json"):
                os.remove(os.path.join(CACHE_DIR, f))
