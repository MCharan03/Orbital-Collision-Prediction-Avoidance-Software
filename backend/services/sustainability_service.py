"""
ASWAN — Space Sustainability Analytics Service

Provides:
  1. Debris density estimation by altitude band
  2. Safe orbit recommendations
  3. Long-term orbital congestion analysis
  4. Large constellation support (100+ satellites)

Debris density model is a simplified version inspired by 
ESA's MASTER (Meteoroid and Space Debris Terrestrial Environment Reference)
model, using known debris population distributions.
"""

import math
import numpy as np
from datetime import datetime, timezone


# ═══════════════════════════════════════════════════════════
# DEBRIS DENSITY MODEL
# ═══════════════════════════════════════════════════════════

# Known high-debris altitude bands (objects > 10cm)
# Based on published ESA and NASA orbital debris population data
DEBRIS_DENSITY_PROFILE = [
    {"alt_min": 200, "alt_max": 400, "density_per_km3": 2.1e-8, "label": "LEO-Low", "trend": "stable"},
    {"alt_min": 400, "alt_max": 600, "density_per_km3": 3.5e-8, "label": "LEO-Mid", "trend": "increasing"},
    {"alt_min": 600, "alt_max": 800, "density_per_km3": 5.2e-8, "label": "LEO-High (Peak)", "trend": "increasing"},
    {"alt_min": 800, "alt_max": 1000, "density_per_km3": 4.8e-8, "label": "LEO-Upper (Iridium/Cosmos)", "trend": "high"},
    {"alt_min": 1000, "alt_max": 1200, "density_per_km3": 2.0e-8, "label": "MEO-Low", "trend": "stable"},
    {"alt_min": 1200, "alt_max": 1500, "density_per_km3": 8.5e-9, "label": "MEO-Transit", "trend": "stable"},
    {"alt_min": 1500, "alt_max": 2000, "density_per_km3": 3.2e-9, "label": "MEO", "trend": "decreasing"},
    {"alt_min": 2000, "alt_max": 20000, "density_per_km3": 1.1e-9, "label": "MEO-High", "trend": "stable"},
    {"alt_min": 20000, "alt_max": 20500, "density_per_km3": 4.0e-9, "label": "GPS Belt", "trend": "stable"},
    {"alt_min": 35000, "alt_max": 36500, "density_per_km3": 6.5e-9, "label": "GEO Belt", "trend": "increasing"},
]


def get_debris_density(alt_km: float) -> dict:
    """Get debris density for a specific altitude."""
    for band in DEBRIS_DENSITY_PROFILE:
        if band["alt_min"] <= alt_km < band["alt_max"]:
            # Risk score 0-100 based on density
            max_density = 5.2e-8  # Peak at 600-800 km
            risk_score = min(100, int((band["density_per_km3"] / max_density) * 100))
            return {
                "altitude": alt_km,
                "density": band["density_per_km3"],
                "label": band["label"],
                "risk_score": risk_score,
                "risk_level": (
                    "HIGH" if risk_score > 60 else
                    "MEDIUM" if risk_score > 30 else
                    "LOW"
                ),
                "trend": band["trend"],
            }
    return {
        "altitude": alt_km,
        "density": 0,
        "label": "Deep Space",
        "risk_score": 0,
        "risk_level": "LOW",
        "trend": "stable",
    }


def get_debris_profile() -> list:
    """Return complete debris density profile for all altitude bands."""
    profile = []
    for band in DEBRIS_DENSITY_PROFILE:
        max_density = 5.2e-8
        risk_score = min(100, int((band["density_per_km3"] / max_density) * 100))
        profile.append({
            "alt_min": band["alt_min"],
            "alt_max": band["alt_max"],
            "density": band["density_per_km3"],
            "risk_score": risk_score,
            "risk_level": (
                "HIGH" if risk_score > 60 else
                "MEDIUM" if risk_score > 30 else
                "LOW"
            ),
            "label": band["label"],
            "trend": band["trend"],
        })
    return profile


# ═══════════════════════════════════════════════════════════
# SAFE ORBIT RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════

def recommend_safe_orbits(target_alt: float = None, count: int = 5) -> list:
    """
    Recommend the safest orbital altitudes based on debris density.
    
    Args:
        target_alt: If provided, find safe alternatives near this altitude
        count: Number of recommendations
    
    Returns:
        List of safe orbit windows
    """
    # Evaluate safety at every 50km interval from 200 to 2000 km
    candidates = []
    for alt in range(200, 2001, 50):
        info = get_debris_density(alt)
        # Avoid deorbit zone < 250 km (too low, atmospheric drag)
        drag_penalty = max(0, (300 - alt) / 100) if alt < 300 else 0

        safety_score = 100 - info["risk_score"] - int(drag_penalty * 20)
        safety_score = max(0, min(100, safety_score))

        candidates.append({
            "altitude_km": alt,
            "safety_score": safety_score,
            "debris_risk": info["risk_score"],
            "debris_level": info["risk_level"],
            "label": info["label"],
            "atmospheric_drag": "HIGH" if alt < 300 else "MODERATE" if alt < 400 else "LOW",
        })

    # Sort by safety score descending
    candidates.sort(key=lambda c: c["safety_score"], reverse=True)

    # If target altitude provided, also include nearby options
    if target_alt:
        nearby = [c for c in candidates if abs(c["altitude_km"] - target_alt) < 200]
        nearby.sort(key=lambda c: c["safety_score"], reverse=True)
        # Merge nearby best with overall best, dedup
        seen = set()
        result = []
        for c in nearby[:2] + candidates:
            if c["altitude_km"] not in seen:
                seen.add(c["altitude_km"])
                result.append(c)
                if len(result) >= count:
                    break
        return result

    return candidates[:count]


# ═══════════════════════════════════════════════════════════
# CONGESTION ANALYSIS
# ═══════════════════════════════════════════════════════════

def analyze_congestion(positions: list = None,
                       projection_years: int = 10) -> dict:
    """
    Analyze current orbital congestion and project future trends.
    
    Uses current satellite positions + known launch rate trends
    to project orbital shell congestion.
    """
    # Current satellite density by altitude band
    current_density = {}
    if positions:
        for pos in positions:
            alt = pos.get("alt", 400)
            band = int(alt / 100) * 100  # 100km bins
            if band not in current_density:
                current_density[band] = 0
            current_density[band] += 1

    # Known annual launch rates (approximate)
    annual_launch_rate = 2800  # ~2024-2026 rate
    growth_rate = 0.12  # 12% annual growth

    # LEO shells most affected
    shell_analysis = []
    leo_shells = [
        {"alt": 300, "name": "Very Low LEO", "capacity": 500},
        {"alt": 400, "name": "ISS/Tiangong Band", "capacity": 400},
        {"alt": 500, "name": "Starlink Primary", "capacity": 8000},
        {"alt": 550, "name": "Starlink Dense", "capacity": 10000},
        {"alt": 600, "name": "LEO Commercial", "capacity": 3000},
        {"alt": 700, "name": "Sun-Sync", "capacity": 2000},
        {"alt": 800, "name": "LEO-Upper", "capacity": 1500},
        {"alt": 1000, "name": "Iridium Band", "capacity": 800},
        {"alt": 1200, "name": "OneWeb", "capacity": 5000},
    ]

    for shell in leo_shells:
        current_count = current_density.get(shell["alt"], 0)
        # Estimate total population in this shell (our data may be partial)
        estimated_current = max(current_count * 10, current_count)

        # Project future
        projections = []
        count = estimated_current
        for year in range(projection_years):
            year_val = datetime.now().year + year
            count = int(count * (1 + growth_rate * 0.3))  # Shell-specific growth
            utilization = min(1.0, count / shell["capacity"])
            projections.append({
                "year": year_val,
                "estimated_objects": count,
                "utilization": round(utilization, 3),
            })

        debris_info = get_debris_density(shell["alt"])

        shell_analysis.append({
            "altitude_km": shell["alt"],
            "name": shell["name"],
            "capacity": shell["capacity"],
            "current_tracked": current_count,
            "debris_risk": debris_info["risk_score"],
            "congestion_level": (
                "CRITICAL" if current_count > shell["capacity"] * 0.8 else
                "HIGH" if current_count > shell["capacity"] * 0.5 else
                "MODERATE" if current_count > shell["capacity"] * 0.2 else
                "LOW"
            ),
            "projections": projections,
        })

    # Overall sustainability metrics
    total_tracked = sum(current_density.values())
    total_capacity = sum(s["capacity"] for s in leo_shells)

    return {
        "total_tracked_objects": total_tracked,
        "total_orbital_capacity": total_capacity,
        "global_utilization": round(total_tracked / total_capacity, 3) if total_capacity > 0 else 0,
        "annual_launch_rate": annual_launch_rate,
        "growth_rate_percent": growth_rate * 100,
        "debris_profile": get_debris_profile(),
        "shell_analysis": shell_analysis,
        "safe_orbit_recommendations": recommend_safe_orbits(),
        "sustainability_outlook": (
            "CONCERNING" if total_tracked > total_capacity * 0.5 else
            "MANAGEABLE" if total_tracked > total_capacity * 0.2 else
            "HEALTHY"
        ),
    }
