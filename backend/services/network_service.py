"""
ASWAN — Dynamic Network Reallocation Service

Provides:
  1. Constellation classification (Starlink, GPS, Galileo, etc.)
  2. Orbital plane grouping & load analysis
  3. Intelligent rerouting recommendations
  4. Before vs After risk comparison
  5. Network health status

Uses satellite positions + weather exposure data to generate
actionable recommendations for network resilience.
"""

import math
import numpy as np
from datetime import datetime, timezone
from collections import defaultdict


# ═══════════════════════════════════════════════════════════
# CONSTELLATION CLASSIFICATION
# ═══════════════════════════════════════════════════════════

CONSTELLATION_PATTERNS = {
    "STARLINK": ["STARLINK"],
    "GPS": ["GPS", "NAVSTAR"],
    "GALILEO": ["GSAT", "GALILEO"],
    "GLONASS": ["COSMOS", "GLONASS"],
    "BEIDOU": ["BEIDOU", "CZ-3"],
    "IRIDIUM": ["IRIDIUM"],
    "ONEWEB": ["ONEWEB"],
    "ISS": ["ISS", "ZARYA", "NAUKA", "POISK", "PRICHAL", "RASSVET"],
    "TIANGONG": ["CSS", "TIANHE", "WENTIAN", "MENGTIAN"],
    "WEATHER": ["NOAA", "GOES", "METOP", "JPSS"],
    "EARTH_OBS": ["LANDSAT", "SENTINEL", "TERRA", "AQUA"],
}


def classify_constellation(name: str) -> str:
    """Classify a satellite into its constellation family."""
    name_upper = name.upper()
    for constellation, patterns in CONSTELLATION_PATTERNS.items():
        for pattern in patterns:
            if pattern in name_upper:
                return constellation
    return "OTHER"


def group_by_constellation(positions: list) -> dict:
    """Group satellites by constellation."""
    groups = defaultdict(list)
    for sat in positions:
        constellation = classify_constellation(sat.get("name", ""))
        groups[constellation].append(sat)
    return dict(groups)


# ═══════════════════════════════════════════════════════════
# ORBITAL PLANE ANALYSIS
# ═══════════════════════════════════════════════════════════

def compute_orbital_planes(positions: list, tolerance_deg: float = 5.0) -> list:
    """
    Group satellites into orbital planes based on inclination similarity.
    Since we don't have RAAN directly, we approximate using lat/alt patterns.
    
    Returns list of orbital plane objects with status.
    """
    if not positions:
        return []

    # Group by altitude band (50 km bins)
    alt_groups = defaultdict(list)
    for sat in positions:
        alt_bin = int(sat.get("alt", 400) / 50) * 50
        alt_groups[alt_bin].append(sat)

    planes = []
    plane_id = 0
    for alt_band, sats in sorted(alt_groups.items()):
        if len(sats) < 2:
            continue

        # Determine plane health based on weather exposure
        exposed = [s for s in sats if s.get("weather_exposure", 0) > 0.3]
        exposure_ratio = len(exposed) / len(sats) if sats else 0

        status = (
            "CRITICAL" if exposure_ratio > 0.6 else
            "HAZARDOUS" if exposure_ratio > 0.3 else
            "ELEVATED" if exposure_ratio > 0.1 else
            "SAFE"
        )

        planes.append({
            "plane_id": plane_id,
            "alt_band": alt_band,
            "satellite_count": len(sats),
            "exposed_count": len(exposed),
            "exposure_ratio": round(exposure_ratio, 3),
            "status": status,
            "satellites": [s.get("norad_id") for s in sats],
        })
        plane_id += 1

    return planes


# ═══════════════════════════════════════════════════════════
# REROUTING RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════

RECOMMENDATION_TEMPLATES = {
    "REROUTE_TRAFFIC": "Reroute to {target} in {plane_status} orbital plane at {alt}km",
    "REDUCE_LOAD": "Reduce traffic by {percent}% — weather exposure {exposure:.0%}",
    "PLANE_SWITCH": "Recommend Δv maneuver to {target_alt}km — {reason}",
    "GROUND_REASSIGN": "Switch uplink to {station} ground station",
    "SAFE_MODE": "Enter safe mode — {reason}",
}

GROUND_STATIONS = [
    {"name": "Svalbard", "lat": 78.2, "lon": 15.6},
    {"name": "McMurdo", "lat": -77.8, "lon": 166.7},
    {"name": "Guam", "lat": 13.4, "lon": 144.8},
    {"name": "Punta Arenas", "lat": -53.1, "lon": -70.9},
    {"name": "Kourou", "lat": 5.2, "lon": -52.8},
    {"name": "Bangalore", "lat": 12.9, "lon": 77.6},
    {"name": "Canberra", "lat": -35.3, "lon": 149.0},
]


def _find_nearest_safe_ground_station(sat_lat: float, sat_lon: float, 
                                        hazardous_lats: list = None) -> dict:
    """Find the nearest ground station outside hazardous zones."""
    best = None
    best_dist = float("inf")

    for station in GROUND_STATIONS:
        # Skip stations in hazardous latitude bands
        if hazardous_lats:
            in_hazard = any(
                abs(station["lat"] - h["lat_center"]) < h.get("lat_spread", 30)
                for h in hazardous_lats
            )
            if in_hazard:
                continue

        dlat = math.radians(sat_lat - station["lat"])
        dlon = math.radians(sat_lon - station["lon"])
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(sat_lat)) * \
            math.cos(math.radians(station["lat"])) * math.sin(dlon / 2) ** 2
        dist = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)) * 6371
        if dist < best_dist:
            best_dist = dist
            best = station

    return best


def generate_recommendations(affected_satellites: list,
                             all_positions: list,
                             risk_zones: list) -> list:
    """
    Generate intelligent rerouting recommendations for affected satellites.
    
    Strategy:
    - HIGH exposure → REDUCE_LOAD + REROUTE_TRAFFIC
    - MEDIUM exposure → REROUTE_TRAFFIC or GROUND_REASSIGN
    - For constellation members → find alternate satellite in safe zone
    """
    if not affected_satellites:
        return []

    recommendations = []
    safe_satellites = [s for s in all_positions
                       if s.get("norad_id") not in
                       {a["norad_id"] for a in affected_satellites}]

    # Group safe satellites by constellation for rerouting targets
    safe_by_constellation = group_by_constellation(safe_satellites)

    for sat in affected_satellites:
        exposure = sat.get("weather_exposure", 0)
        risk_level = sat.get("weather_risk_level", "LOW")
        constellation = classify_constellation(sat.get("name", ""))
        norad_id = sat.get("norad_id")

        if risk_level == "HIGH":
            # Primary: reduce load
            reduce_pct = min(80, int(exposure * 100))
            recommendations.append({
                "satellite": sat["name"],
                "norad_id": norad_id,
                "constellation": constellation,
                "action": "REDUCE_LOAD",
                "priority": "HIGH",
                "detail": RECOMMENDATION_TEMPLATES["REDUCE_LOAD"].format(
                    percent=reduce_pct, exposure=exposure
                ),
                "risk_reduction": int(reduce_pct * 0.6),
                "weather_exposure": exposure,
            })

            # Secondary: find reroute target in same constellation
            targets = safe_by_constellation.get(constellation, safe_satellites[:5])
            if targets:
                target = targets[0]
                recommendations.append({
                    "satellite": sat["name"],
                    "norad_id": norad_id,
                    "constellation": constellation,
                    "action": "REROUTE_TRAFFIC",
                    "priority": "HIGH",
                    "detail": RECOMMENDATION_TEMPLATES["REROUTE_TRAFFIC"].format(
                        target=target.get("name", "ALT-SAT"),
                        plane_status="SAFE",
                        alt=int(target.get("alt", 400))
                    ),
                    "risk_reduction": int(exposure * 80),
                    "reroute_target_id": target.get("norad_id"),
                    "weather_exposure": exposure,
                })

        elif risk_level == "MEDIUM":
            # Try ground station reassignment
            station = _find_nearest_safe_ground_station(
                sat.get("lat", 0), sat.get("lon", 0),
                [z for z in risk_zones if z.get("zone_type", "").startswith("SOLAR_AURORAL")]
            )
            if station:
                recommendations.append({
                    "satellite": sat["name"],
                    "norad_id": norad_id,
                    "constellation": constellation,
                    "action": "GROUND_REASSIGN",
                    "priority": "MEDIUM",
                    "detail": RECOMMENDATION_TEMPLATES["GROUND_REASSIGN"].format(
                        station=station["name"]
                    ),
                    "risk_reduction": int(exposure * 40),
                    "ground_station": station["name"],
                    "weather_exposure": exposure,
                })
            else:
                # Fallback: reroute
                targets = safe_by_constellation.get(constellation, safe_satellites[:3])
                if targets:
                    target = targets[0]
                    recommendations.append({
                        "satellite": sat["name"],
                        "norad_id": norad_id,
                        "constellation": constellation,
                        "action": "REROUTE_TRAFFIC",
                        "priority": "MEDIUM",
                        "detail": RECOMMENDATION_TEMPLATES["REROUTE_TRAFFIC"].format(
                            target=target.get("name", "ALT-SAT"),
                            plane_status="SAFE",
                            alt=int(target.get("alt", 400))
                        ),
                        "risk_reduction": int(exposure * 50),
                        "weather_exposure": exposure,
                    })

        else:  # LOW — just advisory
            recommendations.append({
                "satellite": sat["name"],
                "norad_id": norad_id,
                "constellation": constellation,
                "action": "MONITOR",
                "priority": "LOW",
                "detail": f"Monitor — weather exposure {exposure:.0%}, currently within tolerance",
                "risk_reduction": 0,
                "weather_exposure": exposure,
            })

    # Sort by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recommendations.sort(key=lambda r: priority_order.get(r["priority"], 3))

    return recommendations


# ═══════════════════════════════════════════════════════════
# NETWORK STATUS & BEFORE/AFTER COMPARISON
# ═══════════════════════════════════════════════════════════

def compute_network_status(positions: list,
                           affected_satellites: list,
                           recommendations: list,
                           risk_zones: list) -> dict:
    """
    Compute overall network health and before/after risk comparison.
    """
    total = len(positions) if positions else 1
    affected_count = len(affected_satellites)

    # Risk before (without ASWAN mitigations)
    if not affected_satellites:
        risk_before = 5  # Baseline nominal risk
    else:
        # Weighted by exposure severity
        exposures = [s.get("weather_exposure", 0) for s in affected_satellites]
        risk_before = min(100, int(
            (sum(exposures) / total) * 100 +
            (affected_count / total) * 50 +
            max(exposures, default=0) * 30
        ))

    # Risk after (with ASWAN mitigations applied)
    total_reduction = sum(r.get("risk_reduction", 0) for r in recommendations)
    avg_reduction = total_reduction / max(len(recommendations), 1)
    risk_after = max(5, int(risk_before - avg_reduction))

    # Network status classification
    if risk_before > 75:
        status = "CRITICAL"
    elif risk_before > 50:
        status = "DEGRADED"
    elif risk_before > 25:
        status = "ELEVATED"
    else:
        status = "NOMINAL"

    # Post-mitigation status
    if risk_after > 50:
        mitigated_status = "DEGRADED"
    elif risk_after > 25:
        mitigated_status = "ELEVATED"
    else:
        mitigated_status = "NOMINAL"

    # Constellation breakdown
    constellation_status = defaultdict(lambda: {"total": 0, "affected": 0})
    for pos in (positions or []):
        c = classify_constellation(pos.get("name", ""))
        constellation_status[c]["total"] += 1
    for sat in affected_satellites:
        c = classify_constellation(sat.get("name", ""))
        constellation_status[c]["affected"] += 1

    constellation_summary = []
    for name, data in sorted(constellation_status.items()):
        if data["total"] > 0:
            constellation_summary.append({
                "name": name,
                "total": data["total"],
                "affected": data["affected"],
                "health": round(1 - data["affected"] / data["total"], 2),
            })

    # Orbital planes
    orbital_planes = compute_orbital_planes(
        _merge_exposure_into_positions(positions, affected_satellites)
    )

    return {
        "network_status": status,
        "mitigated_status": mitigated_status,
        "total_satellites": total,
        "total_affected": affected_count,
        "risk_before": risk_before,
        "risk_after": risk_after,
        "risk_reduction": risk_before - risk_after,
        "recommendation_count": len(recommendations),
        "high_priority_count": sum(1 for r in recommendations if r["priority"] == "HIGH"),
        "constellation_health": constellation_summary,
        "orbital_planes": orbital_planes,
        "recommendations": recommendations[:15],  # Top 15 for API response
    }


def _merge_exposure_into_positions(positions, affected):
    """Merge weather exposure data back into position objects."""
    if not positions or not affected:
        return positions or []

    exposure_map = {s["norad_id"]: s.get("weather_exposure", 0) for s in affected}
    merged = []
    for pos in positions:
        p = dict(pos)
        p["weather_exposure"] = exposure_map.get(pos.get("norad_id"), 0)
        merged.append(p)
    return merged
