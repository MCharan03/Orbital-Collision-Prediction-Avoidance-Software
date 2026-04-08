"""
ASWAN — Space Weather Intelligence Service

Provides:
  1. Meteor shower calendar (real-world annual events)
  2. Solar storm simulation (Kp index, CME events)
  3. Dynamic 3D risk zone generation
  4. Satellite exposure analysis

All data is deterministic based on current date/time so it produces 
consistent, realistic results ideal for live demos.
"""

import math
import numpy as np
from datetime import datetime, timezone, timedelta
from config import EARTH_RADIUS_KM

# ═══════════════════════════════════════════════════════════
# METEOR SHOWER CALENDAR — Real astronomical data
# ═══════════════════════════════════════════════════════════

METEOR_SHOWERS = [
    {
        "name": "Quadrantids",
        "peak_month": 1, "peak_day": 3,
        "active_start": (12, 28), "active_end": (1, 12),
        "zhr": 120, "speed_km_s": 41,
        "radiant_ra": 230, "radiant_dec": 49,
        "parent_body": "2003 EH1",
        "risk_alt_min": 200, "risk_alt_max": 600,
    },
    {
        "name": "Lyrids",
        "peak_month": 4, "peak_day": 22,
        "active_start": (4, 16), "active_end": (4, 25),
        "zhr": 18, "speed_km_s": 49,
        "radiant_ra": 271, "radiant_dec": 34,
        "parent_body": "C/1861 G1 Thatcher",
        "risk_alt_min": 200, "risk_alt_max": 700,
    },
    {
        "name": "Eta Aquariids",
        "peak_month": 5, "peak_day": 6,
        "active_start": (4, 19), "active_end": (5, 28),
        "zhr": 50, "speed_km_s": 66,
        "radiant_ra": 338, "radiant_dec": -1,
        "parent_body": "1P/Halley",
        "risk_alt_min": 250, "risk_alt_max": 800,
    },
    {
        "name": "Delta Aquariids",
        "peak_month": 7, "peak_day": 30,
        "active_start": (7, 12), "active_end": (8, 23),
        "zhr": 25, "speed_km_s": 41,
        "radiant_ra": 340, "radiant_dec": -16,
        "parent_body": "96P/Machholz",
        "risk_alt_min": 200, "risk_alt_max": 600,
    },
    {
        "name": "Perseids",
        "peak_month": 8, "peak_day": 12,
        "active_start": (7, 17), "active_end": (8, 24),
        "zhr": 110, "speed_km_s": 59,
        "radiant_ra": 48, "radiant_dec": 58,
        "parent_body": "109P/Swift-Tuttle",
        "risk_alt_min": 200, "risk_alt_max": 900,
    },
    {
        "name": "Orionids",
        "peak_month": 10, "peak_day": 21,
        "active_start": (10, 2), "active_end": (11, 7),
        "zhr": 20, "speed_km_s": 66,
        "radiant_ra": 95, "radiant_dec": 16,
        "parent_body": "1P/Halley",
        "risk_alt_min": 250, "risk_alt_max": 700,
    },
    {
        "name": "Leonids",
        "peak_month": 11, "peak_day": 17,
        "active_start": (11, 6), "active_end": (11, 30),
        "zhr": 15, "speed_km_s": 71,
        "radiant_ra": 152, "radiant_dec": 22,
        "parent_body": "55P/Tempel-Tuttle",
        "risk_alt_min": 200, "risk_alt_max": 800,
    },
    {
        "name": "Geminids",
        "peak_month": 12, "peak_day": 14,
        "active_start": (12, 4), "active_end": (12, 20),
        "zhr": 150, "speed_km_s": 35,
        "radiant_ra": 112, "radiant_dec": 33,
        "parent_body": "3200 Phaethon",
        "risk_alt_min": 200, "risk_alt_max": 700,
    },
    {
        "name": "Ursids",
        "peak_month": 12, "peak_day": 22,
        "active_start": (12, 17), "active_end": (12, 26),
        "zhr": 10, "speed_km_s": 33,
        "radiant_ra": 217, "radiant_dec": 76,
        "parent_body": "8P/Tuttle",
        "risk_alt_min": 200, "risk_alt_max": 500,
    },
]


# ═══════════════════════════════════════════════════════════
# CORE SERVICE FUNCTIONS
# ═══════════════════════════════════════════════════════════

def _day_of_year(month, day):
    """Convert month/day to approximate day of year."""
    days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return sum(days_in_month[:month]) + day


def _is_shower_active(shower, now: datetime) -> bool:
    """Check if a meteor shower is active for the given date."""
    doy_now = now.timetuple().tm_yday
    start_m, start_d = shower["active_start"]
    end_m, end_d = shower["active_end"]
    doy_start = _day_of_year(start_m, start_d)
    doy_end = _day_of_year(end_m, end_d)

    if doy_start <= doy_end:
        return doy_start <= doy_now <= doy_end
    else:
        # Wraps around year boundary (e.g., Quadrantids)
        return doy_now >= doy_start or doy_now <= doy_end


def _shower_intensity(shower, now: datetime) -> float:
    """
    Calculate shower intensity 0-1 based on proximity to peak.
    Gaussian falloff with sigma = 3 days.
    """
    peak_doy = _day_of_year(shower["peak_month"], shower["peak_day"])
    current_doy = now.timetuple().tm_yday
    delta = abs(current_doy - peak_doy)
    if delta > 182:
        delta = 365 - delta  # Handle year wrap

    sigma = 3.0  # days
    intensity = math.exp(-(delta ** 2) / (2 * sigma ** 2))
    return round(min(1.0, intensity), 3)


def _shower_status(shower, now: datetime) -> str:
    """Determine shower status: APPROACHING, ACTIVE, PEAK, FADING."""
    peak_doy = _day_of_year(shower["peak_month"], shower["peak_day"])
    current_doy = now.timetuple().tm_yday
    delta = current_doy - peak_doy
    if delta > 182:
        delta -= 365
    elif delta < -182:
        delta += 365

    if not _is_shower_active(shower, now):
        if -30 <= delta < 0:
            return "APPROACHING"
        return "INACTIVE"
    if abs(delta) <= 1:
        return "PEAK"
    if delta < 0:
        return "ACTIVE"
    return "FADING"


def get_active_meteor_showers(target_time: datetime = None) -> list:
    """
    Get all meteor showers that are currently active or approaching.
    Returns enriched event objects.
    """
    if target_time is None:
        target_time = datetime.now(timezone.utc)

    events = []
    for shower in METEOR_SHOWERS:
        status = _shower_status(shower, target_time)
        if status == "INACTIVE":
            continue

        intensity = _shower_intensity(shower, target_time)
        if intensity < 0.01 and status != "APPROACHING":
            continue

        # Compute peak datetime for this year
        peak_dt = datetime(
            target_time.year, shower["peak_month"], shower["peak_day"],
            12, 0, 0, tzinfo=timezone.utc
        )

        # If peak has passed and shower is not wrapping, use next year
        if peak_dt < target_time and status == "APPROACHING":
            peak_dt = peak_dt.replace(year=target_time.year + 1)

        # Generate risk zones from radiant direction
        risk_zones = _generate_meteor_risk_zones(shower, intensity)

        events.append({
            "id": f"meteor_{shower['name'].lower().replace(' ', '_')}_{target_time.year}",
            "type": "METEOR_SHOWER",
            "name": shower["name"],
            "status": status,
            "peak_time": peak_dt.isoformat(),
            "intensity": intensity,
            "zhr": shower["zhr"],
            "speed_km_s": shower["speed_km_s"],
            "parent_body": shower["parent_body"],
            "risk_zones": risk_zones,
        })

    return events


def _generate_meteor_risk_zones(shower, intensity: float) -> list:
    """
    Generate 3D risk zones for a meteor shower.
    Meteor debris enters along the radiant direction, creating a directional cone.
    """
    dec = shower["radiant_dec"]  # Declination → maps to latitude
    ra = shower["radiant_ra"]   # Right ascension → maps to longitude offset

    # Primary risk zone: centered on radiant declination
    zones = [
        {
            "lat_center": dec,
            "lat_spread": 60,  # Wide spread in latitude
            "lon_center": (ra - 180) % 360 - 180,  # Convert RA to lon approx
            "lon_spread": 120,
            "alt_min": shower["risk_alt_min"],
            "alt_max": shower["risk_alt_max"],
            "intensity": round(intensity * 0.8, 3),
            "zone_type": "METEOR_PRIMARY",
        },
        {
            "lat_center": -dec * 0.3,  # Secondary zone on opposite hemisphere
            "lat_spread": 40,
            "lon_center": ((ra + 180) % 360) - 180,
            "lon_spread": 90,
            "alt_min": shower["risk_alt_min"],
            "alt_max": int(shower["risk_alt_max"] * 0.7),
            "intensity": round(intensity * 0.3, 3),
            "zone_type": "METEOR_SECONDARY",
        },
    ]
    return zones


# ═══════════════════════════════════════════════════════════
# SOLAR STORM SIMULATION
# ═══════════════════════════════════════════════════════════

def _generate_solar_events(target_time: datetime) -> list:
    """
    Generate realistic solar storm events.
    
    Uses a deterministic seed based on the date so results are
    consistent within the same day (good for demos).
    
    Solar cycle 25 peaked ~2024-2025, so we simulate elevated 
    activity with declining but still significant storm frequency.
    """
    # Deterministic seed from date
    seed = target_time.year * 10000 + target_time.month * 100 + target_time.day
    rng = np.random.RandomState(seed)

    # Solar cycle position (simplified)
    # Cycle 25: started 2019, peak ~2024-2025
    years_since_peak = (target_time.year - 2025) + (target_time.month - 6) / 12.0
    cycle_activity = max(0.1, 1.0 - abs(years_since_peak) * 0.15)

    events = []

    # Generate 1-3 solar events depending on activity
    num_events = rng.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
    if cycle_activity < 0.3:
        num_events = max(1, num_events - 1)

    storm_classes = [
        {"class": "G1", "kp": 5, "label": "Minor Geomagnetic Storm", "weight": 0.35},
        {"class": "G2", "kp": 6, "label": "Moderate Geomagnetic Storm", "weight": 0.30},
        {"class": "G3", "kp": 7, "label": "Strong Geomagnetic Storm", "weight": 0.20},
        {"class": "G4", "kp": 8, "label": "Severe Geomagnetic Storm", "weight": 0.10},
        {"class": "G5", "kp": 9, "label": "Extreme Geomagnetic Storm", "weight": 0.05},
    ]

    weights = np.array([s["weight"] for s in storm_classes])
    weights /= weights.sum()

    for i in range(num_events):
        storm = storm_classes[rng.choice(len(storm_classes), p=weights)]

        # Timing: some events in progress, some incoming
        hours_offset = rng.choice([-6, -3, -1, 2, 6, 12, 24, 48])
        arrival = target_time + timedelta(hours=int(hours_offset))

        if hours_offset < 0:
            status = "ACTIVE"
            time_remaining = None
        elif hours_offset < 3:
            status = "IMMINENT"
            time_remaining = f"{hours_offset}h"
        else:
            status = "INCOMING"
            time_remaining = f"{hours_offset}h"

        # CME direction (affects which hemisphere is more impacted)
        cme_lat = float(rng.uniform(-30, 30))

        # Storm intensity based on Kp + cycle activity
        intensity = min(1.0, (storm["kp"] / 9.0) * cycle_activity * float(rng.uniform(0.8, 1.2)))

        # Generate risk zones
        risk_zones = _generate_solar_risk_zones(storm["kp"], cme_lat, intensity)

        events.append({
            "id": f"solar_{storm['class']}_{target_time.strftime('%Y%m%d')}_{i}",
            "type": "SOLAR_STORM",
            "name": f"{storm['class']} — {storm['label']}",
            "storm_class": storm["class"],
            "status": status,
            "arrival_time": arrival.isoformat(),
            "time_remaining": time_remaining,
            "kp_index": storm["kp"],
            "intensity": round(intensity, 3),
            "cme_direction_lat": round(cme_lat, 1),
            "risk_zones": risk_zones,
        })

    return events


def _generate_solar_risk_zones(kp_index: int, cme_lat: float, intensity: float) -> list:
    """
    Generate risk zones for solar storms.
    
    Solar storms primarily affect:
    - Polar regions (auroral zones, 60-90° lat) — most
    - SAA (South Atlantic Anomaly, ~-30° lat, ~-40° lon) — enhanced
    - Global effect at high altitudes (>800 km)
    """
    zones = [
        # Northern auroral zone
        {
            "lat_center": 70.0,
            "lat_spread": 25,
            "lon_center": 0,
            "lon_spread": 360,
            "alt_min": 300,
            "alt_max": 1200,
            "intensity": round(intensity * 0.9, 3),
            "zone_type": "SOLAR_AURORAL_NORTH",
        },
        # Southern auroral zone
        {
            "lat_center": -70.0,
            "lat_spread": 25,
            "lon_center": 0,
            "lon_spread": 360,
            "alt_min": 300,
            "alt_max": 1200,
            "intensity": round(intensity * 0.85, 3),
            "zone_type": "SOLAR_AURORAL_SOUTH",
        },
        # SAA enhancement
        {
            "lat_center": -30.0,
            "lat_spread": 30,
            "lon_center": -40.0,
            "lon_spread": 60,
            "alt_min": 200,
            "alt_max": 800,
            "intensity": round(intensity * 0.6, 3),
            "zone_type": "SOLAR_SAA",
        },
    ]

    # For severe storms (G3+), add global high-altitude zone
    if kp_index >= 7:
        zones.append({
            "lat_center": 0.0,
            "lat_spread": 180,
            "lon_center": 0,
            "lon_spread": 360,
            "alt_min": 800,
            "alt_max": 2000,
            "intensity": round(intensity * 0.5, 3),
            "zone_type": "SOLAR_GLOBAL_HIGH",
        })

    return zones


# ═══════════════════════════════════════════════════════════
# SATELLITE EXPOSURE ANALYSIS
# ═══════════════════════════════════════════════════════════

def analyze_satellite_exposure(positions: list, risk_zones: list) -> list:
    """
    Determine which satellites are inside hazard zones.
    
    Args:
        positions: List of satellite position dicts with lat, lon, alt
        risk_zones: Flat list of all active risk zones
    
    Returns:
        List of affected satellite dicts with exposure details
    """
    affected = []

    for sat in positions:
        sat_lat = sat.get("lat", 0)
        sat_lon = sat.get("lon", 0)
        sat_alt = sat.get("alt", 0)

        max_exposure = 0.0
        exposure_zones = []

        for zone in risk_zones:
            lat_c = zone["lat_center"]
            lat_s = zone["lat_spread"]
            lon_c = zone.get("lon_center", 0)
            lon_s = zone.get("lon_spread", 360)
            alt_min = zone["alt_min"]
            alt_max = zone["alt_max"]

            # Altitude check
            if not (alt_min <= sat_alt <= alt_max):
                continue

            # Latitude check (gaussian falloff)
            lat_delta = abs(sat_lat - lat_c)
            if lat_delta > lat_s:
                continue
            lat_factor = math.exp(-(lat_delta ** 2) / (2 * (lat_s / 2) ** 2))

            # Longitude check (if zone doesn't wrap full globe)
            if lon_s < 360:
                lon_delta = abs(sat_lon - lon_c)
                if lon_delta > 180:
                    lon_delta = 360 - lon_delta
                if lon_delta > lon_s:
                    continue
                lon_factor = math.exp(-(lon_delta ** 2) / (2 * (lon_s / 2) ** 2))
            else:
                lon_factor = 1.0

            # Combined exposure
            exposure = zone["intensity"] * lat_factor * lon_factor
            if exposure > 0.05:
                max_exposure = max(max_exposure, exposure)
                exposure_zones.append({
                    "zone_type": zone["zone_type"],
                    "exposure": round(exposure, 3),
                })

        if max_exposure > 0.05:
            affected.append({
                "norad_id": sat.get("norad_id"),
                "name": sat.get("name", "UNKNOWN"),
                "lat": sat_lat,
                "lon": sat_lon,
                "alt": sat_alt,
                "weather_exposure": round(max_exposure, 3),
                "weather_risk_level": (
                    "HIGH" if max_exposure > 0.6
                    else "MEDIUM" if max_exposure > 0.3
                    else "LOW"
                ),
                "exposure_zones": exposure_zones,
            })

    affected.sort(key=lambda s: s["weather_exposure"], reverse=True)
    return affected


# ═══════════════════════════════════════════════════════════
# MAIN API FUNCTION
# ═══════════════════════════════════════════════════════════

def get_space_weather(target_time: datetime = None, positions: list = None) -> dict:
    """
    Main entry point — returns complete space weather intelligence.
    
    Args:
        target_time: Observation time (default: now)
        positions: Optional satellite positions for exposure analysis
    
    Returns:
        Complete weather report with events, zones, and affected satellites
    """
    if target_time is None:
        target_time = datetime.now(timezone.utc)

    # Collect all events
    meteor_events = get_active_meteor_showers(target_time)
    solar_events = _generate_solar_events(target_time)
    all_events = meteor_events + solar_events

    # Flatten all risk zones
    all_zones = []
    for event in all_events:
        for zone in event.get("risk_zones", []):
            zone_copy = dict(zone)
            zone_copy["event_id"] = event["id"]
            zone_copy["event_name"] = event["name"]
            zone_copy["event_type"] = event["type"]
            all_zones.append(zone_copy)

    # Analyze satellite exposure if positions provided
    affected_satellites = []
    if positions:
        affected_satellites = analyze_satellite_exposure(positions, all_zones)

    # Summary stats
    active_count = sum(1 for e in all_events if e.get("status") in ("ACTIVE", "PEAK", "IMMINENT"))
    max_intensity = max((e.get("intensity", 0) for e in all_events), default=0)

    overall_threat = (
        "CRITICAL" if max_intensity > 0.85 else
        "HIGH" if max_intensity > 0.6 else
        "ELEVATED" if max_intensity > 0.3 else
        "NOMINAL"
    )

    return {
        "time": target_time.isoformat(),
        "overall_threat_level": overall_threat,
        "active_event_count": active_count,
        "total_event_count": len(all_events),
        "max_intensity": round(max_intensity, 3),
        "events": all_events,
        "risk_zones": all_zones,
        "affected_satellites": affected_satellites,
        "affected_count": len(affected_satellites),
    }
