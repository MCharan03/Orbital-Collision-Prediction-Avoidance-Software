"""
24-Hour Predictive Forecasting Service — Proactive Space Traffic Management.

Propagates all tracked satellites 24 hours into the future, buckets
conjunction events into hourly windows, and computes risk trends to
enable proactive traffic management decisions.

Reuses existing services:
  - orbit_service.py   → SGP4 propagation (create_satrec_from_omm, propagate_from_satrec)
  - collision_service.py → distance / velocity computation
  - risk_service.py    → risk scoring & classification
"""

import math
from datetime import datetime, timezone, timedelta
from services.orbit_service import create_satrec_from_omm, propagate_from_satrec
from services.collision_service import compute_distance_km, compute_relative_velocity
from services.risk_service import calculate_risk_score, classify_risk
from config import MONITORING_THRESHOLD_KM


# ─── Hourly Bucket Data Structure ────────────────────────────────

def _empty_bucket(hour: int, start: datetime, end: datetime) -> dict:
    """Create an empty hourly forecast bucket."""
    return {
        "hour": hour,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "peak_risk_score": 0,
        "peak_risk_level": "CLEAR",
        "event_count": 0,
        "closest_approach_km": None,
        "closest_pair": None,
        "high_risk_events": 0,
        "medium_risk_events": 0,
        "low_risk_events": 0,
    }


# ─── Core Forecast Engine ────────────────────────────────────────

def generate_24h_forecast(satellites: list[dict],
                          step_seconds: int = 120,
                          threshold_km: float = MONITORING_THRESHOLD_KM,
                          ) -> dict:
    """
    Generate a 24-hour predictive forecast with hourly risk buckets.

    Single-pass algorithm:
      1. Build Satrec objects from satellite data
      2. Step through 24 hours at `step_seconds` intervals
      3. At each step, compute pairwise distances
      4. Bucket conjunction events into the matching hourly window
      5. After the loop, finalize counts and compute trend

    Args:
        satellites: List of satellite OMM/TLE dicts from CelesTrak
        step_seconds: Propagation time step (default 120s for perf)
        threshold_km: Conjunction distance threshold

    Returns:
        Dict with: hourly_buckets, trend, peak_hour, summary
    """
    now = datetime.now(timezone.utc)

    # ── Build Satrec objects once ──────────────────────────────
    sat_lookup = {}
    for sat in satellites:
        satrec = create_satrec_from_omm(sat)
        if satrec is None:
            continue
        norad_id = int(sat.get("NORAD_CAT_ID", 0))
        sat_lookup[norad_id] = {
            "name": sat.get("OBJECT_NAME", "UNKNOWN"),
            "satrec": satrec,
        }

    sat_ids = list(sat_lookup.keys())
    n = len(sat_ids)

    # ── Co-location filter (reuse pattern from collision_service) ──
    ISS_MODULE_IDS = set()
    CSS_MODULE_IDS = set()
    ISS_KEYWORDS = ["ISS", "ZARYA", "ZVEZDA", "UNITY", "DESTINY", "HARMONY",
                     "COLUMBUS", "KIBO", "CUPOLA", "TRANQUILITY", "POISK",
                     "RASSVET", "NAUKA", "PRICHAL",
                     "PROGRESS", "SOYUZ", "DRAGON", "CYGNUS", "HTV",
                     "STARLINER", "CREW DRAGON"]
    CSS_KEYWORDS = ["TIANHE", "WENTIAN", "MENGTIAN", "CSS",
                    "TIANZHOU", "SHENZHOU"]

    for nid, data in sat_lookup.items():
        name_upper = data["name"].upper()
        if any(kw in name_upper for kw in ISS_KEYWORDS):
            ISS_MODULE_IDS.add(nid)
        elif any(kw in name_upper for kw in CSS_KEYWORDS):
            CSS_MODULE_IDS.add(nid)

    def are_co_located(id1, id2):
        if id1 in ISS_MODULE_IDS and id2 in ISS_MODULE_IDS:
            return True
        if id1 in CSS_MODULE_IDS and id2 in CSS_MODULE_IDS:
            return True
        return False

    # ── Initialize 24 hourly buckets ──────────────────────────
    buckets = []
    for h in range(24):
        bucket_start = now + timedelta(hours=h)
        bucket_end = now + timedelta(hours=h + 1)
        buckets.append(_empty_bucket(h, bucket_start, bucket_end))

    # Per-bucket pair tracking: bucket_idx → { (id1, id2): highest_risk_level }
    bucket_pair_risks = [dict() for _ in range(24)]

    # Global unique pair tracker
    all_pairs_seen = set()

    # ── Single-pass: propagate forward through 24 hours ───────
    step = timedelta(seconds=step_seconds)
    end_time = now + timedelta(hours=24)
    current = now
    total_steps = int(24 * 3600 / step_seconds)
    step_count = 0

    print(f"[FORECAST] Starting 24h forecast: {n} satellites, "
          f"{step_seconds}s steps ({total_steps} steps)")

    risk_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1, "CLEAR": 0}

    while current <= end_time:
        step_count += 1
        if step_count % 200 == 0:
            print(f"[FORECAST] Step {step_count}/{total_steps}")

        # Determine which hourly bucket this time step belongs to
        hours_offset = (current - now).total_seconds() / 3600.0
        bucket_idx = min(int(hours_offset), 23)
        bucket = buckets[bucket_idx]

        # Propagate all satellites to this time step
        positions = {}
        for sid in sat_ids:
            s = sat_lookup[sid]
            pos = propagate_from_satrec(s["satrec"], current)
            if pos:
                positions[sid] = pos

        # Pairwise distance check
        for i in range(len(sat_ids)):
            if sat_ids[i] not in positions:
                continue
            for j in range(i + 1, len(sat_ids)):
                if sat_ids[j] not in positions:
                    continue

                id1, id2 = sat_ids[i], sat_ids[j]

                # Skip co-located station modules
                if are_co_located(id1, id2):
                    continue

                p1 = positions[id1]
                p2 = positions[id2]
                dist = compute_distance_km(p1, p2)

                if dist <= threshold_km:
                    rel_vel = compute_relative_velocity(p1, p2)
                    score = calculate_risk_score(dist, rel_vel)
                    level = classify_risk(score)

                    pair_key = (min(id1, id2), max(id1, id2))
                    all_pairs_seen.add(pair_key)

                    # Track highest risk level for this pair in this bucket
                    prev_level = bucket_pair_risks[bucket_idx].get(pair_key, "CLEAR")
                    if risk_order.get(level, 0) > risk_order.get(prev_level, 0):
                        bucket_pair_risks[bucket_idx][pair_key] = level

                    # Update bucket peak risk
                    if score > bucket["peak_risk_score"]:
                        bucket["peak_risk_score"] = score
                        bucket["peak_risk_level"] = level

                    # Update closest approach for this bucket
                    if bucket["closest_approach_km"] is None or dist < bucket["closest_approach_km"]:
                        bucket["closest_approach_km"] = round(dist, 4)
                        bucket["closest_pair"] = {
                            "sat1_name": sat_lookup[id1]["name"],
                            "sat1_norad_id": id1,
                            "sat2_name": sat_lookup[id2]["name"],
                            "sat2_norad_id": id2,
                            "distance_km": round(dist, 4),
                            "risk_score": score,
                            "risk_level": level,
                            "relative_velocity_km_s": round(rel_vel, 4),
                            "time": current.isoformat(),
                        }

        current += step

    # ── Finalize bucket event counts ──────────────────────────
    for idx in range(24):
        pair_risk_map = bucket_pair_risks[idx]
        buckets[idx]["event_count"] = len(pair_risk_map)
        buckets[idx]["high_risk_events"] = sum(1 for l in pair_risk_map.values() if l == "HIGH")
        buckets[idx]["medium_risk_events"] = sum(1 for l in pair_risk_map.values() if l == "MEDIUM")
        buckets[idx]["low_risk_events"] = sum(1 for l in pair_risk_map.values() if l == "LOW")

    # ── Compute trend ─────────────────────────────────────────
    trend = compute_trend(buckets)

    # ── Find peak hour ────────────────────────────────────────
    peak_bucket = max(buckets, key=lambda b: b["peak_risk_score"])
    peak_hour = peak_bucket["hour"]

    # ── Build summary ─────────────────────────────────────────
    summary = get_forecast_summary(buckets, all_pairs_seen)

    print(f"[FORECAST] Complete: trend={trend}, peak_hour=T+{peak_hour}, "
          f"unique_pairs={len(all_pairs_seen)}")

    return {
        "generated_at": now.isoformat(),
        "hourly_buckets": buckets,
        "trend": trend,
        "peak_hour": peak_hour,
        "summary": summary,
    }


# ─── Trend Analysis ──────────────────────────────────────────────

def compute_trend(hourly_buckets: list[dict]) -> str:
    """
    Analyze risk trend across 24 hourly buckets using linear regression.

    Returns: 'ESCALATING', 'STABLE', or 'DEESCALATING'
    """
    scores = [b["peak_risk_score"] for b in hourly_buckets]
    n = len(scores)

    if n < 2 or all(s == 0 for s in scores):
        return "STABLE"

    # Simple linear regression: slope of peak_risk_score vs hour
    x_mean = (n - 1) / 2.0
    y_mean = sum(scores) / n

    numerator = sum((i - x_mean) * (scores[i] - y_mean) for i in range(n))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return "STABLE"

    slope = numerator / denominator

    # Thresholds: slope > +1 per hour = escalating, < -1 = deescalating
    if slope > 1.0:
        return "ESCALATING"
    elif slope < -1.0:
        return "DEESCALATING"
    else:
        return "STABLE"


# ─── Summary ─────────────────────────────────────────────────────

def get_forecast_summary(hourly_buckets: list[dict],
                         all_pairs: set) -> dict:
    """Aggregate forecast data into a summary."""
    high_hours = sum(1 for b in hourly_buckets if b["peak_risk_level"] == "HIGH")
    medium_hours = sum(1 for b in hourly_buckets if b["peak_risk_level"] == "MEDIUM")
    low_hours = sum(1 for b in hourly_buckets if b["peak_risk_level"] == "LOW")
    clear_hours = sum(1 for b in hourly_buckets if b["peak_risk_level"] == "CLEAR")

    max_risk = max(b["peak_risk_score"] for b in hourly_buckets)
    total_events = sum(b["event_count"] for b in hourly_buckets)

    return {
        "unique_conjunction_pairs": len(all_pairs),
        "total_events_across_hours": total_events,
        "max_risk_score": max_risk,
        "hours_high_risk": high_hours,
        "hours_medium_risk": medium_hours,
        "hours_low_risk": low_hours,
        "hours_clear": clear_hours,
    }
