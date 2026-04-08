"""
Risk Scoring Engine — Advanced multi-factor risk assessment.

Computes a risk score (0-100) based on:
1. Distance (primary factor) — exponential urgency as distance decreases
2. Relative velocity (secondary factor) — higher velocity = less reaction time = higher risk
3. Proximity urgency — exponential increase near collision threshold

Risk Classification:
  0-30:  LOW    (green)  — Normal operations, monitoring only
  31-60: MEDIUM (yellow) — Elevated risk, increased monitoring
  61-100: HIGH  (red)    — Critical risk, potential avoidance maneuver needed
"""

import math
from config import COLLISION_THRESHOLD_KM, WARNING_THRESHOLD_KM, MONITORING_THRESHOLD_KM


def calculate_risk_score(distance_km: float,
                         relative_velocity_km_s: float = 0.0,
                         size_factor: float = 1.0) -> int:
    """
    Calculate collision risk score (0-100) using multi-factor model.

    Args:
        distance_km: Distance between two satellites in km
        relative_velocity_km_s: Relative velocity magnitude in km/s
        size_factor: Multiplier for object size (default 1.0, larger = higher risk)

    Returns:
        Risk score integer from 0 to 100

    Formula breakdown:
      1. Distance factor (0-1): Exponential decay based on distance
         - f_dist = exp(-distance / reference_distance)
         - Reference distance = COLLISION_THRESHOLD_KM
         - At threshold: f_dist ≈ 0.37, at 0 km: f_dist = 1.0

      2. Velocity factor (0-1): Normalized relative velocity
         - Typical LEO relative velocity: 0-15 km/s
         - f_vel = min(1.0, rel_vel / max_rel_vel)
         - Higher velocity = harder to avoid = higher risk

      3. Urgency multiplier: Exponential boost at very close range
         - Kicks in strongly below COLLISION_THRESHOLD_KM
         - f_urgency = exp(-distance / (threshold / 3))

      Final: score = 100 * (0.6 * f_dist + 0.25 * f_urgency + 0.15 * f_vel) * size_factor
    """
    if distance_km <= 0:
        return 100

    # Very far satellites get zero risk
    if distance_km > MONITORING_THRESHOLD_KM:
        return 0

    # ── Factor 1: Distance-based risk (primary, 60% weight) ──
    # Exponential decay — risk increases exponentially as distance decreases
    reference_distance = WARNING_THRESHOLD_KM
    f_distance = math.exp(-distance_km / reference_distance)

    # ── Factor 2: Proximity urgency (25% weight) ──
    # Extreme exponential boost at very close range
    urgency_scale = COLLISION_THRESHOLD_KM / 3.0  # ~16.7 km
    f_urgency = math.exp(-distance_km / urgency_scale)

    # ── Factor 3: Relative velocity (15% weight) ──
    # Typical max relative velocity in LEO: ~15 km/s (head-on at ~7.5 km/s each)
    max_relative_velocity = 15.0
    if relative_velocity_km_s > 0:
        f_velocity = min(1.0, relative_velocity_km_s / max_relative_velocity)
    else:
        f_velocity = 0.3  # Default moderate velocity assumption

    # ── Combined score ──
    raw_score = (
        0.60 * f_distance +
        0.25 * f_urgency +
        0.15 * f_velocity
    ) * size_factor

    # Scale to 0-100
    score = int(min(100, max(0, raw_score * 100)))

    return score


def classify_risk(score: int) -> str:
    """
    Classify numeric risk score into risk level.

    Returns: 'LOW', 'MEDIUM', or 'HIGH'
    """
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MEDIUM"
    else:
        return "HIGH"


def get_risk_color(level: str) -> str:
    """Get hex color for a risk level."""
    colors = {
        "LOW": "#22c55e",
        "MEDIUM": "#f59e0b",
        "HIGH": "#ef4444",
    }
    return colors.get(level, "#64748b")


def compute_risk_assessment(distance_km: float,
                            relative_velocity_km_s: float,
                            sat1_name: str, sat1_id: int,
                            sat2_name: str, sat2_id: int) -> dict:
    """
    Full risk assessment for a satellite pair.

    Returns a detailed breakdown of contributing factors.
    """
    score = calculate_risk_score(distance_km, relative_velocity_km_s)
    level = classify_risk(score)

    # Contributing factor breakdown (for UI display)
    reference_distance = WARNING_THRESHOLD_KM
    urgency_scale = COLLISION_THRESHOLD_KM / 3.0
    max_rel_vel = 15.0

    factors = {
        "distance_factor": round(math.exp(-distance_km / reference_distance), 4),
        "urgency_factor": round(math.exp(-distance_km / urgency_scale), 4),
        "velocity_factor": round(min(1.0, relative_velocity_km_s / max_rel_vel), 4),
        "distance_km": round(distance_km, 4),
        "relative_velocity_km_s": round(relative_velocity_km_s, 4),
        "thresholds": {
            "collision": COLLISION_THRESHOLD_KM,
            "warning": WARNING_THRESHOLD_KM,
            "monitoring": MONITORING_THRESHOLD_KM,
        },
    }

    return {
        "sat1_norad_id": sat1_id,
        "sat1_name": sat1_name,
        "sat2_norad_id": sat2_id,
        "sat2_name": sat2_name,
        "score": score,
        "level": level,
        "color": get_risk_color(level),
        "distance_km": round(distance_km, 4),
        "relative_velocity_km_s": round(relative_velocity_km_s, 4),
        "contributing_factors": factors,
    }
