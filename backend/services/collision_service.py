"""
Collision Detection Service — Pairwise distance computation with closest approach tracking.

Detects potential collisions between satellite pairs by:
1. Computing Euclidean distance in TEME frame
2. Computing relative velocity magnitude
3. Tracking minimum distance over a time window (closest approach)
4. Returning full conjunction event data

─── SCALABILITY NOTES ───
Current implementation uses O(n²) pairwise comparison, suitable for 20-100 satellites.

FUTURE UPGRADE PATH (when scaling to 1000+ satellites):
  - Replace brute-force with KD-Tree spatial indexing (scipy.spatial.KDTree)
  - Use ball-tree for spherical coordinates
  - Pre-filter by orbital shell (altitude bands) to eliminate impossible pairs
  - Implement parallel processing with multiprocessing or joblib
  - Consider chunked time-stepping with early termination

Example KD-Tree upgrade:
  from scipy.spatial import KDTree
  positions = np.array([[p.x, p.y, p.z] for p in all_positions])
  tree = KDTree(positions)
  pairs = tree.query_pairs(r=threshold_km / EARTH_RADIUS_KM)
"""

import math
import numpy as np
from datetime import datetime, timezone, timedelta
from services.orbit_service import propagate_satellite, create_satrec_from_omm, propagate_from_satrec
from services.risk_service import calculate_risk_score, classify_risk
from models.satellite import CollisionEvent
from config import (
    COLLISION_THRESHOLD_KM,
    WARNING_THRESHOLD_KM,
    MONITORING_THRESHOLD_KM,
    PROPAGATION_STEP_SECONDS,
    PREDICTION_WINDOW_HOURS,
    EARTH_RADIUS_KM,
)


def compute_distance_km(pos1: dict, pos2: dict) -> float:
    """
    Euclidean distance between two satellite positions in km.
    Uses TEME coordinates (x_teme, y_teme, z_teme) for accuracy.
    """
    dx = pos1["x_teme"] - pos2["x_teme"]
    dy = pos1["y_teme"] - pos2["y_teme"]
    dz = pos1["z_teme"] - pos2["z_teme"]
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def compute_relative_velocity(pos1: dict, pos2: dict) -> float:
    """
    Relative velocity magnitude between two satellites in km/s.
    Formula: |v1 - v2| = sqrt((vx1-vx2)² + (vy1-vy2)² + (vz1-vz2)²)
    """
    dvx = pos1["vx_teme"] - pos2["vx_teme"]
    dvy = pos1["vy_teme"] - pos2["vy_teme"]
    dvz = pos1["vz_teme"] - pos2["vz_teme"]
    return math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz)


def detect_current_collisions(satellites: list[dict],
                               target_time: datetime = None,
                               threshold_km: float = MONITORING_THRESHOLD_KM
                               ) -> list[CollisionEvent]:
    """
    Detect potential collisions at a single point in time.

    Performs O(n²) pairwise distance check between all satellites.
    Returns collision events for pairs within the monitoring threshold.

    # SCALABILITY: For 1000+ satellites, replace this with KD-Tree.
    # See module docstring for upgrade path.
    """
    if target_time is None:
        target_time = datetime.now(timezone.utc)

    # Propagate all satellites to target time
    positions = {}
    for sat in satellites:
        tle1 = sat.get("TLE_LINE1", "")
        tle2 = sat.get("TLE_LINE2", "")

        pos = propagate_satellite(tle1, tle2, target_time, omm_data=sat)
        if pos:
            norad_id = int(sat.get("NORAD_CAT_ID", 0))
            positions[norad_id] = {
                "name": sat.get("OBJECT_NAME", "UNKNOWN"),
                "norad_id": norad_id,
                "pos": pos,
            }

    # Pairwise distance computation
    # SCALABILITY: This is O(n²). Replace with spatial index for n > 100.
    events = []
    sat_ids = list(positions.keys())

    for i in range(len(sat_ids)):
        for j in range(i + 1, len(sat_ids)):
            id1 = sat_ids[i]
            id2 = sat_ids[j]
            s1 = positions[id1]
            s2 = positions[id2]

            distance = compute_distance_km(s1["pos"], s2["pos"])

            if distance <= threshold_km:
                rel_vel = compute_relative_velocity(s1["pos"], s2["pos"])
                score = calculate_risk_score(distance, rel_vel)
                level = classify_risk(score)

                events.append(CollisionEvent(
                    sat1_name=s1["name"],
                    sat1_norad_id=id1,
                    sat2_name=s2["name"],
                    sat2_norad_id=id2,
                    min_distance_km=round(distance, 4),
                    time_of_closest_approach=target_time.isoformat(),
                    relative_velocity_km_s=round(rel_vel, 4),
                    risk_score=score,
                    risk_level=level,
                    sat1_position={
                        "x": s1["pos"]["x"], "y": s1["pos"]["y"], "z": s1["pos"]["z"],
                        "lat": s1["pos"]["lat"], "lon": s1["pos"]["lon"], "alt": s1["pos"]["alt"],
                    },
                    sat2_position={
                        "x": s2["pos"]["x"], "y": s2["pos"]["y"], "z": s2["pos"]["z"],
                        "lat": s2["pos"]["lat"], "lon": s2["pos"]["lon"], "alt": s2["pos"]["alt"],
                    },
                ))

    # Sort by risk score descending (highest risk first)
    events.sort(key=lambda e: e.risk_score, reverse=True)
    return events


def predict_closest_approaches(satellites: list[dict],
                                hours_ahead: int = PREDICTION_WINDOW_HOURS,
                                step_seconds: int = PROPAGATION_STEP_SECONDS,
                                threshold_km: float = MONITORING_THRESHOLD_KM
                                ) -> list[CollisionEvent]:
    """
    Predict closest approaches over a future time window.

    For each satellite pair, tracks the MINIMUM distance across all time steps
    and reports the time of closest approach (TCA).

    This is the CRITICAL closest approach detection:
    - Steps forward in time at regular intervals
    - For each pair, tracks the minimum distance seen
    - Reports the time step where minimum distance occurred
    - Computes relative velocity at TCA for risk scoring

    Args:
        satellites: List of satellite dicts with TLE data
        hours_ahead: How many hours to look ahead
        step_seconds: Time resolution in seconds
        threshold_km: Only report pairs closer than this

    Returns:
        List of CollisionEvent with closest approach data
    """
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=hours_ahead)
    step = timedelta(seconds=step_seconds)

    # Build satellite lookup — construct Satrec objects once for reuse
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

    # Track closest approach for each pair
    # Key: (id1, id2) → {min_dist, tca_time, pos1_at_tca, pos2_at_tca, rel_vel}
    closest = {}

    # Step through time
    current = now
    total_steps = int((end - now).total_seconds() / step_seconds)
    step_count = 0

    print(f"[COLLISION] Predicting closest approaches: {n} satellites, "
          f"{hours_ahead}h window, {step_seconds}s steps ({total_steps} steps)")

    while current <= end:
        step_count += 1
        if step_count % 100 == 0:
            print(f"[COLLISION] Step {step_count}/{total_steps}")

        # Propagate all satellites to this time step
        positions = {}
        for sid in sat_ids:
            s = sat_lookup[sid]
            pos = propagate_from_satrec(s["satrec"], current)
            if pos:
                positions[sid] = pos

        # Pairwise check at this time step
        # SCALABILITY: Use KD-Tree here for n > 100
        for i in range(len(sat_ids)):
            if sat_ids[i] not in positions:
                continue
            for j in range(i + 1, len(sat_ids)):
                if sat_ids[j] not in positions:
                    continue

                id1, id2 = sat_ids[i], sat_ids[j]
                p1 = positions[id1]
                p2 = positions[id2]

                dist = compute_distance_km(p1, p2)

                pair_key = (id1, id2)
                if pair_key not in closest or dist < closest[pair_key]["min_dist"]:
                    rel_vel = compute_relative_velocity(p1, p2)
                    closest[pair_key] = {
                        "min_dist": dist,
                        "tca_time": current,
                        "pos1": p1,
                        "pos2": p2,
                        "rel_vel": rel_vel,
                    }

        current += step

    # Convert to CollisionEvents (only pairs within threshold)
    events = []
    for (id1, id2), data in closest.items():
        if data["min_dist"] > threshold_km:
            continue

        score = calculate_risk_score(data["min_dist"], data["rel_vel"])
        level = classify_risk(score)

        events.append(CollisionEvent(
            sat1_name=sat_lookup[id1]["name"],
            sat1_norad_id=id1,
            sat2_name=sat_lookup[id2]["name"],
            sat2_norad_id=id2,
            min_distance_km=round(data["min_dist"], 4),
            time_of_closest_approach=data["tca_time"].isoformat(),
            relative_velocity_km_s=round(data["rel_vel"], 4),
            risk_score=score,
            risk_level=level,
            sat1_position={
                "x": data["pos1"]["x"], "y": data["pos1"]["y"], "z": data["pos1"]["z"],
                "lat": data["pos1"]["lat"], "lon": data["pos1"]["lon"], "alt": data["pos1"]["alt"],
            },
            sat2_position={
                "x": data["pos2"]["x"], "y": data["pos2"]["y"], "z": data["pos2"]["z"],
                "lat": data["pos2"]["lat"], "lon": data["pos2"]["lon"], "alt": data["pos2"]["alt"],
            },
        ))

    events.sort(key=lambda e: e.risk_score, reverse=True)
    print(f"[COLLISION] Found {len(events)} close approaches within {threshold_km} km")
    return events


def get_collision_summary(events: list[CollisionEvent]) -> dict:
    """Aggregate collision events into a summary."""
    high = sum(1 for e in events if e.risk_level == "HIGH")
    medium = sum(1 for e in events if e.risk_level == "MEDIUM")
    low = sum(1 for e in events if e.risk_level == "LOW")

    closest = min(events, key=lambda e: e.min_distance_km) if events else None

    return {
        "total_events": len(events),
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "closest_approach": closest.to_dict() if closest else None,
    }
