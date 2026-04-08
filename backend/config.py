"""
Forge-X Configuration
All system-wide constants and thresholds.
"""

import os

# ─── CelesTrak API ───────────────────────────────────────────────
CELESTRAK_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"
DEFAULT_SATELLITE_GROUPS = ["stations", "active"]
CACHE_TTL_SECONDS = 7200  # 2 hours — respects CelesTrak rate limits
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")

# ─── SGP4 Propagation ───────────────────────────────────────────
PROPAGATION_STEP_SECONDS = 60       # Time step for orbit propagation
PREDICTION_WINDOW_HOURS = 72        # How far ahead to predict
ORBIT_TRAIL_MINUTES = 90            # Orbit trail duration (~ 1 LEO period)
ORBIT_TRAIL_STEP_SECONDS = 30       # Step size for trail points

# ─── Collision Detection ─────────────────────────────────────────
COLLISION_THRESHOLD_KM = 5.0        # Critical collision distance
WARNING_THRESHOLD_KM = 20.0         # Warning distance
MONITORING_THRESHOLD_KM = 100.0     # Monitoring distance

# ─── Risk Scoring ────────────────────────────────────────────────
RISK_LEVELS = {
    "LOW": {"min": 0, "max": 30, "color": "#22c55e"},
    "MEDIUM": {"min": 31, "max": 60, "color": "#f59e0b"},
    "HIGH": {"min": 61, "max": 100, "color": "#ef4444"},
}

# ─── Earth Constants ─────────────────────────────────────────────
EARTH_RADIUS_KM = 6371.0
EARTH_MU = 398600.4418  # km³/s² — Standard gravitational parameter

# ─── Server ──────────────────────────────────────────────────────
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
FLASK_DEBUG = True
CORS_ORIGINS = ["*"]
